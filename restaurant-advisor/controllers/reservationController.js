//Falten mètodes per crear, modificar, eliminar i llistar reserves

const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Store = mongoose.model('Store');
const User = mongoose.model('User');

exports.addReservation = async (req, res) => {
    req.body.user = req.user._id;
    req.body.store = req.params.id;
    req.body.date = new Date(req.body.date);
    req.body.timeSlot = req.body.timeSlot;

    //restarem max reservas disponibles
    const store = await Store.findById(req.params.id);
    console.log(store);
    store.maxReservations = store.maxReservations - 1;
    console.log(store);
    await store.save();

    const newReservation = new Reservation(req.body);
    await newReservation.save();
    req.flash('success', 'Reservation saved');
    res.redirect('back');
};

exports.getUserReservations = async (req, res) => {
    const reservations = await Reservation.find({ user: req.user._id, status: 'confirmed' });
    res.render('reservations', { title: 'Reservations', reservations });
};

exports.cancelReservation = async (req, res) => {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
        req.flash('error', 'Reservation not found');
        return res.redirect('back');
    }
    
    reservation.status = 'cancelled';
    await reservation.save();
    req.flash('success', 'Reservation cancelled');
    res.redirect('back');
}
