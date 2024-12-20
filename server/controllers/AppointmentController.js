const Appointment = require("../models/appointment.js");
const Doctor = require("../models/doctor.js");
const Patient = require("../models/patient.js");
const mongoose = require("mongoose");


const getDepartments = async (req, res) => {
    try {
        let departmentList = await Doctor.distinct("department");
        res.json({ message: "success", 'departments': departmentList });
    }
    catch (error) {
        res.status(500).json({ errors: [error.message] });
    }
}

const populateAppointmentData = (query) => {
    return Appointment.find(query).populate({
        path: 'doctorId',
        populate: {
            path: 'userId'
        }
    }).populate({
        path: 'patientId',
        populate: {
            path: 'userId'
        }
    });
};

const getAppointments = async (req, res) => {
    try {
        const isTimeSlotAvailable = req.body.isTimeSlotAvailable;
        const appointmentDate = req.body.appDate ? new Date(req.body.appDate).toISOString().slice(0, 10) : null;
        const docID = req.body.doctorID;

        let query = {
            'appointmentDate': appointmentDate,
            'isTimeSlotAvailable': isTimeSlotAvailable,
            'completed': !isTimeSlotAvailable
        };

        if (docID) {
            query.doctorId = mongoose.Types.ObjectId(docID);
        } else if (req.sender.userType === "Doctor") {
            query.doctorId = req.sender.doctorId;
        } else if (req.sender.userType === "Patient") {
            query.patientId = req.sender.patientId;
        }

        const appointments = await populateAppointmentData(query);
        res.json({ message: "success", appointments });
    } catch (error) {
        res.status(500).json({ errors: [error.message] });
    }
};


const createAppointmentSlot = async (req, res) => {
    try {
        let appDate = (new Date(req.body.appDate).toISOString().slice(0, 10));
        let timeSlots = req.body.timeSlots;
        let docID = req.body.doctorID;
        // console.log(slot)
        for (slot of timeSlots) {
            let app = await Appointment.find({
                'appointmentDate': appDate,
                'appointmentTime': slot,
                'doctorId': docID
            });
            if (!(app.length > 0)) {
                let appointment = await Appointment.create({
                    'appointmentDate': appDate,
                    'appointmentTime': slot,
                    'doctorId': docID
                });
            }
        }
        // console.log(appDate)
        res.json({ message: "success" });


    } catch (error) {
        res.status(404).json({ errors: [error.message] });
    }
}

const bookAppointment = async (req, res) => {
    try {
        let appointment = await Appointment.findOneAndUpdate({
            'isTimeSlotAvailable': true,
            'appointmentDate': req.body.appDate,
            'appointmentTime': req.body.appTime,
            'doctorId': mongoose.Types.ObjectId(req.body.doctorId)
        }, {
            'isTimeSlotAvailable': false,
            'patientId': mongoose.Types.ObjectId(req.body.patientId)
        });
        // console.log("appointment",appointment);
        if (appointment) {
            res.json({ message: "success" });
        }
        else {
            res.status(404).json({ errors: ["Could not book appointment. Please Try again."] });
        }
    } catch (error) {
        res.status(404).json({ errors: [error.message] });
    }
}

const deleteAppointment = async (req, res) => {
    // console.log("delete appointment")
    try {
        let appointment = await Appointment.findByIdAndDelete(req.body.appointmentId);
        if (appointment) {
            res.json({ message: "success" });
        }
        else {
            res.status(404).json({ errors: ["Could not delete appointment"] });
        }
    } catch (error) {
        res.status(404).json({ errors: [error.message] });
    }
}
const getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id).lean();
        appointment.doctorDetails = await Doctor.findById(appointment.doctorId);
        appointment.patientDetails = await Patient.findById(appointment.patientId);
        res.json({ message: "success", "appointment": appointment });
    } catch (error) {
        res.status(404).json({ errors: [error.message] });
    }
}

const updateAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            {
                'isTimeSlotAvailable': false,
                'appointmentDate': req.body.appDate,
                'appointmentTime': req.body.appTime,
                'doctorId': mongoose.Types.ObjectId(req.body.doctorId),
                'patientId': mongoose.Types.ObjectId(req.body.patientId)
            });
        if (appointment) {
            const openSlot = await Appointment.findOneAndDelete({
                'isTimeSlotAvailable': true,
                'appointmentDate': req.body.appDate,
                'appointmentTime': req.body.appTime,
            })
            res.json({ message: "success" });
        }

    } catch (error) {
        res.status(404).json({ errors: [error.message] });
    }
}


module.exports = {
    getDepartments,
    getAppointments,
    getAppointmentById,
    createAppointmentSlot,
    bookAppointment,
    deleteAppointment,
    updateAppointmentById
}