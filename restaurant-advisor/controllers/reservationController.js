const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Store = mongoose.model('Store');
const User = mongoose.model('User');

exports.addReservation = async (req, res) => {
    req.body.user = req.user._id;
    req.body.store = req.params.id;
    const reservationDate = new Date(req.body.date); // Fecha de la reserva
    const reservationTime = req.body.timeSlot; // Intervalo de tiempo (por ejemplo, "13:00-15:00")

    // Dividir `reservationTime` en `startTime` y `endTime`
    const [startTime, endTime] = reservationTime.split('-');

    // Obtener el día de la semana de la fecha de reserva (Sunday = 0, Monday = 1, etc.)
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = daysOfWeek[reservationDate.getUTCDay()];

    // Buscar la tienda
    const store = await Store.findById(req.params.id);
    if (!store) {
        req.flash('error', 'Store not found');
        return res.redirect('back');
    }

    // Buscar el timeSlot correspondiente por día de la semana y el intervalo de tiempo
    const timeSlot = store.timeSlots.find(
        slot => slot.dayOfWeek === dayOfWeek && slot.startTime === startTime && slot.endTime === endTime
    );
    if (!timeSlot) {
        req.flash('error', 'Time slot not found for the selected day and time interval');
        return res.redirect('back');
    }

    // Verificar si ya existe una reserva en este timeSlot para la fecha específica
    let existingReservation = timeSlot.reservations.find(
        res => new Date(res.date).toISOString() === reservationDate.toISOString()
    );

    if (existingReservation) {
        // Si la cantidad de reservas actuales alcanza el límite, no permitir la reserva
        if (existingReservation.currentReservations >= timeSlot.maxReservations) {
            req.flash('error', 'No available reservations for this time slot');
            return res.redirect('back');
        }

        // Incrementar el número de reservas existentes en ese timeSlot
        existingReservation.currentReservations += 1;
    } else {
        // Si no hay reservas existentes para esa fecha, agregar una nueva entrada en `reservations`
        timeSlot.reservations.push({
            date: reservationDate,
            currentReservations: 1
        });
    }

    // Guardar la tienda con la actualización de las reservas en el timeSlot
    await store.save();

    // Crear una nueva entrada en la colección de reservas principal
    const newReservation = new Reservation(req.body);
    await newReservation.save();

    req.flash('success', 'Reservation saved');
    res.redirect('back');
};

exports.getUserReservations = async (req, res) => {
    const reservations = await Reservation.find({ user: req.user._id, status: 'confirmed' }).populate('store');
    res.render('reservations', { title: 'Reservations', reservations });
};

exports.cancelReservation = async (req, res) => {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
        req.flash('error', 'Reservation not found');
        return res.redirect('back');
    }

    const store = await Store.findById(reservation.store);
    if (!store) {
        req.flash('error', 'Store not found');
        return res.redirect('back');
    }

    const timeSlot = store.timeSlots.find(slot =>
        slot.reservations.some(res => res.date.toISOString() === reservation.date.toISOString())
    );

    if (timeSlot) {
        const existingReservation = timeSlot.reservations.find(
            res => res.date.toISOString() === reservation.date.toISOString()
        );

        if (existingReservation) {
            existingReservation.currentReservations = Math.max(
                0,
                existingReservation.currentReservations - 1
            );

            if (existingReservation.currentReservations === 0) {
                timeSlot.reservations = timeSlot.reservations.filter(
                    res => res.date.toISOString() !== reservation.date.toISOString()
                );
            }

            await store.save();
        }
    }

    reservation.status = 'cancelled';
    await reservation.save();
    req.flash('success', 'Reservation cancelled');
    res.redirect('back');
};
