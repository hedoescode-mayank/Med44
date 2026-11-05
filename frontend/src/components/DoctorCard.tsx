import { motion } from 'framer-motion'
import { Star, Clock, DollarSign, Calendar } from 'lucide-react'
import type { Doctor } from '../store/appointmentStore'

interface DoctorCardProps {
  doctor: Doctor
  onBook: (doctor: Doctor) => void
}

export default function DoctorCard({ doctor, onBook }: DoctorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(37,132,83,0.15)' }}
      className="card border border-gray-100 cursor-pointer transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-primary">
          {doctor.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-textDark text-base truncate">{doctor.name}</h3>
          <p className="text-textMuted text-sm">{doctor.specialty}</p>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-textDark">{doctor.rating}</span>
              <span className="text-xs text-textMuted">({doctor.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-textMuted">
              <Clock size={12} />
              <span>{doctor.experience}y exp</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-textMuted">
              <DollarSign size={12} />
              <span>₹{doctor.fee}</span>
            </div>
          </div>

          {/* Available slots */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(doctor.availableSlots || doctor.available_slots || ['09:00 AM', '11:30 AM', '03:00 PM']).slice(0, 3).map((slot) => (
              <span
                key={slot}
                className="text-xs bg-primary-light text-primary-dark px-2 py-0.5 rounded-full font-medium"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onBook(doctor)}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-semibold py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-200 text-sm"
      >
        <Calendar size={15} />
        Book Appointment
      </button>
    </motion.div>
  )
}
