import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  UserCheck,
  Building2,
  MapPin,
  Phone,
  Navigation,
  Sparkles,
  Ticket,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react'
import { useAppointmentStore, type Doctor, type Appointment } from '../store/appointmentStore'
import api, { facilityApi } from '../services/api'
import toast from 'react-hot-toast'

const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: 1,
    name: 'Dr. Priya Sharma',
    specialty: 'General Medicine',
    rating: 4.9,
    experience: 12,
    hospital: 'Apollo Hospitals, New Delhi',
    location: 'Sarita Vihar, New Delhi',
    availableSlots: ['09:30 AM', '11:00 AM', '02:30 PM', '04:00 PM'],
  },
  {
    id: 2,
    name: 'Dr. Rahul Mehta',
    specialty: 'Cardiology',
    rating: 4.8,
    experience: 18,
    hospital: 'Fortis Escorts Heart Institute',
    location: 'Okhla, New Delhi',
    availableSlots: ['10:00 AM', '12:00 PM', '03:00 PM'],
  },
  {
    id: 3,
    name: 'Dr. Ananya Roy',
    specialty: 'Dermatology',
    rating: 4.7,
    experience: 9,
    hospital: 'Max Super Speciality Hospital',
    location: 'Saket, New Delhi',
    availableSlots: ['10:30 AM', '01:30 PM', '04:30 PM'],
  },
  {
    id: 4,
    name: 'Dr. Vikram Singh',
    specialty: 'Orthopedics',
    rating: 4.8,
    experience: 15,
    hospital: 'Medanta - The Medicity',
    location: 'Gurugram',
    availableSlots: ['09:00 AM', '11:30 AM', '03:30 PM'],
  },
  {
    id: 5,
    name: 'Dr. Meena Krishnan',
    specialty: 'Pulmonology',
    rating: 4.9,
    experience: 14,
    hospital: 'Manipal Hospital',
    location: 'Dwarka, New Delhi',
    availableSlots: ['11:00 AM', '02:00 PM', '05:00 PM'],
  },
  {
    id: 6,
    name: 'Dr. Arun Patel',
    specialty: 'Neurology',
    rating: 4.8,
    experience: 16,
    hospital: 'Sir Ganga Ram Hospital',
    location: 'Rajinder Nagar, New Delhi',
    availableSlots: ['10:00 AM', '01:00 PM', '03:30 PM'],
  },
]

const SPECIALTIES = [
  'All',
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Pulmonology',
  'Neurology',
]

// Google Calendar URL generator
function getGoogleCalendarUrl(apt: {
  doctorName: string
  specialty?: string
  date: string
  time: string
  location?: string
}) {
  const title = encodeURIComponent(`Med44 Consultation: ${apt.doctorName} (${apt.specialty || 'General'})`)
  const details = encodeURIComponent(
    `Consultation booked via Med44 AI Health Nurse.\n\nDoctor: ${apt.doctorName}\nSpecialty: ${apt.specialty || 'General'}\nReminder: Please arrive 10 minutes prior.\n\n⚠️ Med44 provides appointment coordination only.`
  )
  const loc = encodeURIComponent(apt.location || 'Med44 Primary Health Center')

  // Parse date and time
  const [year, month, day] = apt.date.split('-').map(Number)
  let hours = 10
  let minutes = 0
  if (apt.time) {
    const parts = apt.time.split(' ')
    const [h, m] = (parts[0] || '10:00').split(':').map(Number)
    const meridiem = (parts[1] || 'AM').toUpperCase()
    hours = meridiem === 'PM' && h < 12 ? h + 12 : meridiem === 'AM' && h === 12 ? 0 : h
    minutes = m || 0
  }

  const startDate = new Date(Date.UTC(year || 2026, (month || 11) - 1, day || 10, hours, minutes))
  const endDate = new Date(startDate.getTime() + 45 * 60 * 1000)

  const pad = (n: number) => n.toString().padStart(2, '0')
  const startIso = `${startDate.getUTCFullYear()}${pad(startDate.getUTCMonth() + 1)}${pad(
    startDate.getUTCDate()
  )}T${pad(startDate.getUTCHours())}${pad(startDate.getUTCMinutes())}00Z`
  const endIso = `${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(
    endDate.getUTCDate()
  )}T${pad(endDate.getUTCHours())}${pad(endDate.getUTCMinutes())}00Z`

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${loc}`
}

// RFC 5545 compliant iCalendar (.ics) download
function downloadIcsFile(apt: {
  doctorName: string
  specialty?: string
  date: string
  time: string
  location?: string
}) {
  const title = `Med44 Consultation with ${apt.doctorName}`
  const desc = `Appointment booked via Med44 with ${apt.doctorName} (${apt.specialty}).`
  const loc = apt.location || 'Med44 Primary Health Center'

  const [year, month, day] = apt.date.split('-').map(Number)
  let hours = 10
  let minutes = 0
  if (apt.time) {
    const parts = apt.time.split(' ')
    const [h, m] = (parts[0] || '10:00').split(':').map(Number)
    const meridiem = (parts[1] || 'AM').toUpperCase()
    hours = meridiem === 'PM' && h < 12 ? h + 12 : meridiem === 'AM' && h === 12 ? 0 : h
    minutes = m || 0
  }

  const pad = (n: number) => n.toString().padStart(2, '0')
  const dtstart = `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00Z`
  const dtend = `${year}${pad(month)}${pad(day)}T${pad(hours + 1)}${pad(minutes)}00Z`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Med44//AI Health Nurse//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${loc}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${title} in 30 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `med44-${apt.doctorName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AppointmentsPage() {
  const { appointments, fetchAppointments, addAppointment, cancelAppointment } = useAppointmentStore()
  const [viewMode, setViewMode] = useState<'doctors' | 'facilities'>('doctors')
  const [doctors, setDoctors] = useState<Doctor[]>(DEFAULT_DOCTORS)
  const [selectedSpecialty, setSelectedSpecialty] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [selectedSlot, setSelectedSlot] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null)

  // PS3 Facilities Discovery State
  const [facilities, setFacilities] = useState<any[]>([])
  const [facilitiesLoading, setFacilitiesLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('All')
  const [selectedAccessibility, setSelectedAccessibility] = useState('All')
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [locationEnabled, setLocationEnabled] = useState(false)

  // Reschedule State
  const [reschedulingApt, setReschedulingApt] = useState<any | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState(
    new Date(Date.now() + 172800000).toISOString().split('T')[0]
  )
  const [rescheduleSlot, setRescheduleSlot] = useState('11:00 AM')

  useEffect(() => {
    fetchAppointments().catch(() => {})
    api
      .get('/appointments/doctors')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDoctors(res.data)
        }
      })
      .catch(() => {})

    loadFacilities()
  }, [fetchAppointments])

  const loadFacilities = async (coords?: { lat: number; lon: number }) => {
    try {
      setFacilitiesLoading(true)
      const params: any = {}
      if (coords) {
        params.lat = coords.lat
        params.lon = coords.lon
      }
      if (searchQuery) params.q = searchQuery
      if (selectedLanguage !== 'All') params.language = selectedLanguage
      if (selectedAccessibility !== 'All') params.accessibility = selectedAccessibility
      const res = await facilityApi.getAll(params)
      setFacilities(res.data || [])
    } catch (err) {
      console.error('Failed to load facilities:', err)
    } finally {
      setFacilitiesLoading(false)
    }
  }

  const handleRequestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
          setUserCoords(coords)
          setLocationEnabled(true)
          toast.success('Location detected. Showing nearest facilities.')
          loadFacilities(coords)
        },
        () => {
          // Fallback to Delhi NCR coordinates
          const coords = { lat: 28.5355, lon: 77.2910 }
          setUserCoords(coords)
          setLocationEnabled(true)
          toast('Location permission denied. Using Delhi NCR reference center.')
          loadFacilities(coords)
        }
      )
    }
  }

  const handleReschedule = async () => {
    if (!reschedulingApt) return
    try {
      await api.post(`/appointments/${reschedulingApt.id}/reschedule`, {
        new_date: rescheduleDate,
        new_slot: rescheduleSlot,
      })
      toast.success('Appointment rescheduled successfully!')
      setReschedulingApt(null)
      await fetchAppointments()
    } catch (err) {
      toast.error('Failed to reschedule appointment')
    }
  }

  const filteredDoctors = doctors.filter((doc) => {
    const matchSpecialty =
      selectedSpecialty === 'All' ||
      doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
    const matchSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.hospital && doc.hospital.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchSpecialty && matchSearch
  })

  const handleConfirmBooking = async () => {
    if (!bookingDoctor || !selectedSlot) {
      toast.error('Please select a time slot')
      return
    }

    const payload = {
      doctor_name: bookingDoctor.name,
      specialty: bookingDoctor.specialty,
      appointment_date: selectedDate,
      slot_time: selectedSlot,
      notes: bookingNotes,
    }

    try {
      const res = await api.post('/appointments', payload)
      const created = res.data || {
        id: Date.now(),
        ...payload,
        status: 'CONFIRMED',
      }
      addAppointment(created)
      setConfirmedBooking({
        doctorName: bookingDoctor.name,
        specialty: bookingDoctor.specialty,
        date: selectedDate,
        time: selectedSlot,
        location: bookingDoctor.hospital || bookingDoctor.location,
      })
      toast.success('Appointment booked successfully! 🌿')
    } catch {
      // Offline fallback
      const localAppt: Appointment = {
        id: `offline-${Date.now()}`,
        doctor_name: bookingDoctor.name,
        specialty: bookingDoctor.specialty,
        appointment_date: selectedDate,
        slot_time: selectedSlot,
        status: 'PENDING',
        notes: `[Offline Queued] ${bookingNotes}`,
        is_synced: false,
      }
      addAppointment(localAppt)
      setConfirmedBooking({
        doctorName: bookingDoctor.name,
        specialty: bookingDoctor.specialty,
        date: selectedDate,
        time: selectedSlot,
        location: bookingDoctor.hospital,
      })
      toast.success('Offline booking queued. Will sync upon connection.')
    }

    setBookingDoctor(null)
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Top Title & Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-textDark tracking-tight">
            Doctor Discovery & Appointments
          </h1>
          <p className="text-sm text-textSecondary mt-1">
            Book consultations directly when you need care. No forced automated bookings.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-borderSoft text-xs font-semibold text-textSecondary shadow-soft">
          <UserCheck size={14} className="text-primary" />
          <span>Verified Specialists</span>
        </div>
      </div>

      {/* View Switcher: Doctors vs Healthcare Facilities (PS3 Module 1) */}
      <div className="flex border-b border-borderSoft gap-6">
        <button
          onClick={() => setViewMode('doctors')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
            viewMode === 'doctors'
              ? 'border-primary text-primary'
              : 'border-transparent text-textMuted hover:text-textDark'
          }`}
        >
          <UserCheck size={16} />
          <span>Doctors & Specialists ({filteredDoctors.length})</span>
        </button>
        <button
          onClick={() => setViewMode('facilities')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
            viewMode === 'facilities'
              ? 'border-primary text-primary'
              : 'border-transparent text-textMuted hover:text-textDark'
          }`}
        >
          <Building2 size={16} />
          <span>Verified Facilities & Hospitals ({facilities.length})</span>
        </button>
      </div>

      {viewMode === 'doctors' ? (
        <>
          {/* Search & Specialty Filter */}
          <div className="card p-4 sm:p-6 border border-borderSoft space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by doctor name, specialty, or clinic..."
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Specialty Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap ${
                    selectedSpecialty === spec
                      ? 'bg-primary text-white shadow-soft'
                      : 'bg-surfaceSoft text-textSecondary hover:bg-gray-100'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="card p-6 border border-borderSoft flex flex-col justify-between hover:border-primary/40 transition-all shadow-soft group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-textDark group-hover:text-primary transition-colors">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-semibold text-primary mt-0.5">{doc.specialty}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-bold">
                      <Star size={12} className="fill-current text-amber-500" />
                      <span>{doc.rating}</span>
                    </div>
                  </div>

                  <p className="text-xs text-textSecondary mt-3 line-clamp-2">
                    {doc.hospital || 'Med44 Primary Care Center, Sarita Vihar'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-borderSoft">
                    <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-2">
                      Available Slots
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(doc.availableSlots || ['10:00 AM', '02:00 PM', '04:30 PM']).map((slot) => (
                        <span
                          key={slot}
                          className="px-2.5 py-1 rounded-md bg-surfaceSoft text-textDark text-[11px] font-semibold"
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setBookingDoctor(doc)
                    setSelectedSlot(doc.availableSlots?.[0] || '10:00 AM')
                  }}
                  className="button-primary w-full mt-6 text-xs"
                >
                  <CalendarIcon size={14} />
                  <span>Select Date & Book</span>
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Facilities Discovery View (PS3 Module 1) */
        <div className="space-y-6">
          {/* Facility Filters & Geolocation */}
          <div className="card p-4 sm:p-6 border border-borderSoft space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    loadFacilities(userCoords || undefined)
                  }}
                  placeholder="Search hospitals, clinics, or dental centers..."
                  className="input pl-10"
                />
              </div>

              <button
                onClick={handleRequestLocation}
                className="button-secondary text-xs whitespace-nowrap flex items-center gap-1.5 py-2.5 px-4"
              >
                <Navigation size={14} className={locationEnabled ? 'text-primary' : ''} />
                <span>{locationEnabled ? 'Nearby Distance Active' : 'Use My Location'}</span>
              </button>
            </div>

            {/* Language & Accessibility Filters */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-borderSoft text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-textMuted">Language:</span>
                {['All', 'Hindi', 'English', 'Tamil'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang)
                      loadFacilities(userCoords || undefined)
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      selectedLanguage === lang
                        ? 'bg-primary text-white'
                        : 'bg-surfaceSoft text-textSecondary hover:bg-gray-100'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-textMuted">Accessibility:</span>
                {['All', 'wheelchair', 'elevator'].map((acc) => (
                  <button
                    key={acc}
                    onClick={() => {
                      setSelectedAccessibility(acc)
                      loadFacilities(userCoords || undefined)
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold capitalize ${
                      selectedAccessibility === acc
                        ? 'bg-primary text-white'
                        : 'bg-surfaceSoft text-textSecondary hover:bg-gray-100'
                    }`}
                  >
                    {acc === 'All' ? 'All' : acc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Facility Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="card p-6 border border-borderSoft flex flex-col justify-between hover:border-primary/40 transition-all shadow-soft space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surfaceSoft text-primary">
                        {fac.facility_type?.replace(/_/g, ' ')}
                      </span>
                      <h3 className="font-bold text-base text-textDark mt-1">{fac.name}</h3>
                    </div>
                    {fac.distance_km !== null && fac.distance_km !== undefined && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 whitespace-nowrap">
                        {fac.distance_km} km
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-textSecondary flex items-start gap-1.5">
                    <MapPin size={14} className="text-textMuted flex-shrink-0 mt-0.5" />
                    <span>{fac.address}</span>
                  </p>

                  {/* Why it matches explainability badge */}
                  {fac.match_reasons && fac.match_reasons.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[11px] text-emerald-900 flex items-start gap-1.5">
                      <Sparkles size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{fac.match_reasons.join(' · ')}</span>
                    </div>
                  )}

                  {/* Services tags */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">
                      Available Services
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {fac.services?.slice(0, 4).map((s: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-surfaceSoft text-textDark text-[11px]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Source & Freshness (PS3 Requirement: Never scrape or fabricate) */}
                  <div className="text-[10px] text-textMuted border-t border-borderSoft pt-2 flex items-center justify-between">
                    <span>Source: {fac.source}</span>
                    <span>Verified: {fac.last_verified}</span>
                  </div>
                </div>

                {/* Actions: Call, Directions, Book */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href={`tel:${fac.contact_number}`}
                    className="button-secondary text-xs py-2 justify-center flex items-center gap-1.5"
                  >
                    <Phone size={13} />
                    <span>Call Facility</span>
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      fac.name + ' ' + fac.address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-secondary text-xs py-2 justify-center flex items-center gap-1.5"
                  >
                    <MapPin size={13} />
                    <span>Directions</span>
                  </a>
                  <button
                    onClick={() => {
                      setBookingDoctor({
                        id: fac.id,
                        name: `${fac.name} (General OPD)`,
                        specialty: fac.facility_type?.replace(/_/g, ' ') || 'Primary Care',
                        rating: 4.8,
                        experience: 10,
                        hospital: fac.name,
                        location: fac.address,
                        availableSlots: ['09:30 AM', '11:30 AM', '03:00 PM', '05:00 PM'],
                      })
                      setSelectedSlot('09:30 AM')
                    }}
                    className="button-primary col-span-2 text-xs py-2 justify-center flex items-center gap-1.5"
                  >
                    <CalendarIcon size={13} />
                    <span>Book OPD Slot at Facility</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Real Scheduled Appointments Section */}
      <div className="card p-6 border border-borderSoft space-y-4">
        <h2 className="text-lg font-bold text-textDark">My Scheduled Appointments</h2>

        {appointments.length > 0 ? (
          <div className="divide-y divide-borderSoft">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-textDark">{apt.doctor_name || apt.doctorName}</h4>
                    {apt.queue_token && (
                      <span className="flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Ticket size={11} />
                        <span>{apt.queue_token}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-textSecondary mt-0.5">
                    {apt.specialty} · {apt.slot_time || apt.time} on {apt.appointment_date || apt.date}
                  </p>
                  {apt.notes && <p className="text-[11px] text-textMuted mt-1">Note: {apt.notes}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      (apt.status || '').toLowerCase() === 'confirmed'
                        ? 'bg-primary-light text-primary-dark'
                        : (apt.status || '').toLowerCase() === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {apt.status}
                  </span>

                  {/* Reschedule Button */}
                  {(apt.status || '').toLowerCase() !== 'cancelled' && (
                    <button
                      onClick={() => {
                        setReschedulingApt(apt)
                        setRescheduleSlot(apt.slot_time || apt.time || '10:00 AM')
                      }}
                      className="p-2 rounded-lg border border-borderSoft hover:bg-surfaceSoft text-textSecondary hover:text-textDark text-xs font-semibold inline-flex items-center gap-1"
                      title="Reschedule Consultation"
                    >
                      <CalendarClock size={13} />
                      <span className="hidden sm:inline">Reschedule</span>
                    </button>
                  )}

                  {/* Add to Google Calendar button directly on each active card */}
                  {(apt.status || '').toLowerCase() !== 'cancelled' && (
                    <a
                      href={getGoogleCalendarUrl({
                        doctorName: apt.doctor_name || apt.doctorName || 'Doctor',
                        specialty: apt.specialty,
                        date: apt.appointment_date || apt.date || '2026-11-10',
                        time: apt.slot_time || apt.time || '10:00 AM',
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-borderSoft hover:bg-surfaceSoft text-textSecondary hover:text-textDark text-xs font-semibold inline-flex items-center gap-1"
                      title="Add to Google Calendar"
                    >
                      <ExternalLink size={13} />
                      <span className="hidden sm:inline">G-Cal</span>
                    </a>
                  )}

                  {(apt.status || '').toLowerCase() !== 'cancelled' && (
                    <button
                      onClick={() =>
                        downloadIcsFile({
                          doctorName: apt.doctor_name || apt.doctorName || 'Doctor',
                          specialty: apt.specialty,
                          date: apt.appointment_date || apt.date || '2026-11-10',
                          time: apt.slot_time || apt.time || '10:00 AM',
                        })
                      }
                      className="p-2 rounded-lg border border-borderSoft hover:bg-surfaceSoft text-textSecondary hover:text-textDark text-xs font-semibold inline-flex items-center gap-1"
                      title="Download .ics for Apple / Outlook"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">.ics</span>
                    </button>
                  )}

                  {(apt.status || '').toLowerCase() !== 'cancelled' && (
                    <button
                      onClick={() => cancelAppointment(apt.id)}
                      className="text-xs font-semibold text-danger hover:underline ml-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-textSecondary">
              No appointments currently scheduled. Browse specialists above to book.
            </p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface w-full max-w-md p-6 border border-borderSoft shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-borderSoft">
                <div>
                  <h3 className="font-bold text-base text-textDark">Book Consultation</h3>
                  <p className="text-xs text-primary font-semibold">{bookingDoctor.name}</p>
                </div>
                <button
                  onClick={() => setBookingDoctor(null)}
                  className="p-1.5 text-textSecondary hover:text-textDark rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                  Select Slot
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(bookingDoctor.availableSlots || ['10:00 AM', '02:00 PM', '04:30 PM']).map(
                    (slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          selectedSlot === slot
                            ? 'border-primary bg-primary-light text-primary-dark font-bold'
                            : 'border-borderSoft hover:bg-surfaceSoft'
                        }`}
                      >
                        {slot}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                  Reason / Notes for Doctor (Optional)
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Periodic checkup, mild headache for 2 days"
                  className="input py-2 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBookingDoctor(null)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  className="button-primary text-xs"
                >
                  Confirm Appointment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation & Calendar Export Modal */}
      <AnimatePresence>
        {confirmedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="card bg-surface w-full max-w-md p-6 border border-borderSoft shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-primary-light text-primary mx-auto flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="font-bold text-lg text-textDark">Appointment Confirmed!</h3>
                <p className="text-xs text-textSecondary mt-1">
                  {confirmedBooking.doctorName} · {confirmedBooking.specialty}
                </p>
                <p className="text-xs font-bold text-primary mt-1">
                  {confirmedBooking.date} at {confirmedBooking.time}
                </p>
              </div>

              {/* Calendar Action Buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={getGoogleCalendarUrl(confirmedBooking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary w-full text-xs py-3 justify-center"
                >
                  <ExternalLink size={15} />
                  <span>Add to Google Calendar</span>
                </a>

                <button
                  onClick={() => downloadIcsFile(confirmedBooking)}
                  className="button-secondary w-full text-xs py-3 justify-center"
                >
                  <Download size={15} />
                  <span>Download .ics File (Apple / Outlook)</span>
                </button>
              </div>

              <button
                onClick={() => setConfirmedBooking(null)}
                className="text-xs font-semibold text-textMuted hover:text-textDark pt-2"
              >
                Close & Return to Appointments
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal (PS3 Module 3) */}
      <AnimatePresence>
        {reschedulingApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card bg-surface w-full max-w-md p-6 border border-borderSoft shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-borderSoft">
                <div>
                  <h3 className="font-bold text-base text-textDark">Reschedule Appointment</h3>
                  <p className="text-xs text-primary font-semibold">
                    {reschedulingApt.doctor_name || reschedulingApt.doctorName}
                  </p>
                </div>
                <button
                  onClick={() => setReschedulingApt(null)}
                  className="p-1.5 text-textSecondary hover:text-textDark rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                  New Time Slot
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['09:30 AM', '11:00 AM', '02:30 PM', '04:30 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setRescheduleSlot(slot)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                        rescheduleSlot === slot
                          ? 'border-primary bg-primary-light text-primary-dark font-bold'
                          : 'border-borderSoft hover:bg-surfaceSoft'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReschedulingApt(null)}
                  className="button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReschedule}
                  className="button-primary text-xs"
                >
                  Confirm Reschedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
