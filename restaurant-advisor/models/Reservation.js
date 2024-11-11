const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Usuario que realiza la reserva
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }, // Restaurante donde se realiza la reserva
  date: Date, // Fecha de la reserva
  timeSlot: String, // Franja horaria, Ejemplo: "12:00 - 14:00"
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' } // Estado de la reserva
});

module.exports = mongoose.model('Reservation', reservationSchema);
