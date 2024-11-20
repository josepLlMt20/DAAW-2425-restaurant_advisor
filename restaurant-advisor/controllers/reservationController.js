const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Store = mongoose.model('Store');
const User = mongoose.model('User');

exports.addReservation = async (req, res) => {
    req.body.user = req.user._id;
    req.body.store = req.params.id;
    const reservationDate = new Date(req.body.date); 
    const reservationTime = req.body.timeSlot;

    
    const [startTime, endTime] = reservationTime.split('-');

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = daysOfWeek[reservationDate.getUTCDay()];

    const store = await Store.findById(req.params.id);
    if (!store) {
        req.flash('error', 'Store not found');
        return res.redirect('back');
    }

    const timeSlot = store.timeSlots.find(
        slot => slot.dayOfWeek === dayOfWeek && slot.startTime === startTime && slot.endTime === endTime
    );
    if (!timeSlot) {
        req.flash('error', 'Time slot not found for the selected day and time interval');
        return res.redirect('back');
    }

    let existingReservation = timeSlot.reservations.find(
        res => new Date(res.date).toISOString() === reservationDate.toISOString()
    );

    if (existingReservation) {
        if (existingReservation.currentReservations >= timeSlot.maxReservations) {
            req.flash('error', 'No available reservations for this time slot');
            return res.redirect('back');
        }

        existingReservation.currentReservations += 1;
    } else {
        timeSlot.reservations.push({
            date: reservationDate,
            currentReservations: 1
        });
    }

    await store.save();

    const newReservation = new Reservation(req.body);
    await newReservation.save();

    req.flash('success', 'Reservation saved');
    res.redirect('back');
};

exports.getUserReservations = async (req, res) => {
    const reservations = await Reservation.find({ user: req.user._id}).populate('store');
    res.render('userReservations', { title: 'Reservations', reservations });
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
