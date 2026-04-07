'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { submitBookingAction } from './actions'
import { getShiftAvailability } from '@/app/provider/availability/actions'
import type { ShiftKey } from '@/app/provider/availability/shiftConstants'

type ShiftAvailMap = Record<string, Record<ShiftKey, { status: 'available'|'partial'|'booked'|'off'; bookedHours: number; remainingHours: number }>>

// ── Types ──────────────────────────────────────────────────────────────────────
export type Nurse = {
  id:              string
  name:            string
  specialization:  string
  city:            string
  hourlyRate:      number
  dailyRate:       number
  gender:          string
  nationality:     string
  experienceYears: number
  bio:             string
  photoUrl:        string | null
  languages:       string[]
}

type Mode = 'smart' | 'browse' | 'ai'

// ── Constants ─────────────────────────────────────────────────────────────────
const SERVICES = ['Home Nursing','ICU Care','Post-Surgery Care','Elderly Care','Pediatric Care','Wound Care','IV Therapy','Physiotherapy','General Care']
const CITIES   = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha']
const SHIFTS   = [
  { key: 'morning', label: 'Morning', time: '8AM – 4PM',  icon: '🌅' },
  { key: 'evening', label: 'Evening', time: '4PM – 12AM', icon: '🌆' },
  { key: 'night',   label: 'Night',   time: '12AM – 8AM', icon: '🌙' },
]
const CARE_FOR   = ['Myself', 'Mother', 'Father', 'Child', 'Other']
const PLATFORM_FEE = 0

// fallback demo nurses shown only when DB returns nothing
const DEMO_NURSES: Nurse[] = [
  { id:'d1', name:'Sarah Al-Rashidi',  specialization:'ICU / Post-Surgery', city:'Riyadh', hourlyRate:380, dailyRate:2800, gender:'female', nationality:'Saudi',    experienceYears:8, bio:'Experienced ICU nurse.',   photoUrl:null, languages:['Arabic','English'] },
  { id:'d2', name:'Hana Al-Qahtani',   specialization:'Pediatric / NICU',   city:'Riyadh', hourlyRate:400, dailyRate:3000, gender:'female', nationality:'Saudi',    experienceYears:7, bio:'Specialist in pediatrics.', photoUrl:null, languages:['Arabic'] },
  { id:'d3', name:'Khalid Mansour',    specialization:'General Nursing',    city:'Riyadh', hourlyRate:320, dailyRate:2400, gender:'male',   nationality:'Pakistani', experienceYears:5, bio:'General home nursing.',    photoUrl:null, languages:['Urdu','English'] },
]

function nurseEmoji(n: Nurse) { return n.gender === 'male' ? '👨‍⚕️' : '👩‍⚕️' }

const nxt = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0] }

// Shift time boundaries
const SHIFT_BOUNDS: Record<string, { startH: number; endH: number }> = {
  morning: { startH: 8,  endH: 16 },
  evening: { startH: 16, endH: 24 },
  night:   { startH: 0,  endH: 8  },
}

// Calculate hours between two HH:MM times within a shift (handles midnight for evening)
function calcHours(startTime: string, endTime: string, shift: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let startMins = sh * 60 + sm
  let endMins   = eh * 60 + em
  if (shift === 'evening' && endMins === 0) endMins = 24 * 60  // midnight = end of evening
  if (endMins <= startMins) return 0
  return Math.round((endMins - startMins) / 60 * 10) / 10
}

// Generate hourly slots for a shift
function shiftSlots(shift: string): string[] {
  const bounds = SHIFT_BOUNDS[shift] ?? { startH: 8, endH: 16 }
  const slots: string[] = []
  for (let h = bounds.startH; h <= bounds.endH; h++) {
    const label = h === 0 || h === 24 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
    const val   = h === 24 ? '00:00' : `${String(h).padStart(2, '0')}:00`
    slots.push(val + '|' + label)
  }
  return slots
}

// Price helpers — rate is hourly, hours is selected duration
function calcPrice(hourlyRate: number, hours: number, vatRate: number) {
  const base  = hourlyRate * hours
  const vat   = Math.round(base * (vatRate / 100))
  const total = base + vat + PLATFORM_FEE
  return { base, vat, total, vatRate, hours }
}

// ── AI responses ──────────────────────────────────────────────────────────────
const AI_RESPONSES = [
  { triggers: ['nurse','nursing','care','need','help'], reply: "I understand you're looking for home nursing care! 🏥\n\nCould you tell me:\n• Which city are you in?\n• When do you need care to start?\n• Is it for yourself or a family member?" },
  { triggers: ['riyadh','jeddah','dammam','mecca','medina','city'], reply: "Got it — I'm searching for verified providers in that area. 📍\n\nA few more questions:\n• How many days of care do you need?\n• Do you prefer morning, evening, or night shift?" },
  { triggers: ['monday','tuesday','week','next','tomorrow','today','start'], reply: "Perfect! I've found excellent matches for you based on your needs. 🎯\n\nCheck the AI Suggestions panel on the right — I can book any of them for you instantly!" },
  { triggers: ['father','mother','elderly','parent','family'], reply: "Caring for a loved one is so important. 🌸\n\nDo you have specific medical conditions to consider?\n(e.g. diabetes, mobility issues, heart condition)" },
  { triggers: ['physio','physiotherapy','exercise','mobility'], reply: "Looking for certified physiotherapists now. 🤸\n\nWould you prefer post-surgery recovery, sports injury, or general mobility specialist?" },
  { triggers: ['female','woman','lady'], reply: "Understood — I'll filter for female nurses only. 👩‍⚕️\n\nI've updated the suggestions to show only female providers available in your area." },
  { triggers: ['book','confirm','yes','proceed'], reply: "Let me lock that in for you. ✅\n\nClick 'Proceed to Book' on the suggestion card to finalise. You'll review the full price breakdown before confirming." },
]
const AI_FALLBACK = "I'm here to help! Tell me what kind of care you need, your city, and when — and I'll find the perfect provider. 😊"

// ── Main Component ────────────────────────────────────────────────────────────
export default function PatientBookingClient({
  userId, userName, userEmail, nurses, vatRate, commission = 10, minBookingHours = 2,
  availableGenders, availableNationalities, availableLanguages,
}: {
  userId: string
  userName: string
  userEmail: string
  nurses: Nurse[]
  vatRate: number
  commission?: number
  minBookingHours?: number
  availableGenders: string[]
  availableNationalities: string[]
  availableLanguages: string[]
}) {
  // Apply commission to nurse base rate → patient-facing rate
  const patientRate = (nurseRate: number) => Math.ceil(nurseRate * (1 + commission / 100))

  const allNurses = nurses.length > 0 ? nurses : DEMO_NURSES

  // Build filter options from DB data
  const genderOptions      = ['Any', ...availableGenders.map(g => g.charAt(0).toUpperCase() + g.slice(1) + ' Only')]
  const nationalityOptions = ['Any', ...availableNationalities]
  const languageOptions    = availableLanguages.length > 0 ? availableLanguages : ['Arabic', 'English']

  // Cities from actual DB nurses
  const availableCities = Array.from(new Set(allNurses.map(n => n.city).filter(Boolean))).sort()

  const [mode,    setMode]    = useState<Mode | null>(null)
  const [step,    setStep]    = useState(1)
  const [isPending, startT]   = useTransition()
  const [success, setSuccess] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [error,   setError]   = useState('')
  const [toast,   setToast]   = useState('')
  const [detailNurse,    setDetailNurse]    = useState<Nurse | null>(null)
  const [availNurse,     setAvailNurse]     = useState<Nurse | null>(null)
  const [availDate,      setAvailDate]      = useState('')
  const [availData,      setAvailData]      = useState<Record<ShiftKey,{status:string;bookedHours:number;remainingHours:number}>|null>(null)
  const [availLoading,   setAvailLoading]   = useState(false)
  const [sessions,  setSessions]  = useState(0)

  // ── Booking Type state (shared across modes) ────────────────────────────
  const [bookingType,   setBookingType]   = useState<'one_time'|'weekly'|'monthly'>('one_time')
  const [selectedDays,  setSelectedDays]  = useState<number[]>([])
  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  function toggleDay(d: number) { setSelectedDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d]) }

  // ── Smart Match state ────────────────────────────────────────────────────
  const [careType,    setCareType]    = useState(SERVICES[0])
  const [careFor,     setCareFor]     = useState('Myself')
  const [smartCity,   setSmartCity]   = useState(availableCities[0] ?? CITIES[0])
  const [smartShift,      setSmartShift]      = useState(SHIFTS[1].key)
  const [smartStartTime,  setSmartStartTime]  = useState('16:00')
  const [smartEndTime,    setSmartEndTime]    = useState('18:00')
  const [smartStart,  setSmartStart]  = useState(nxt(1))
  const [smartEnd,    setSmartEnd]    = useState(nxt(4))
  const [smartNotes,  setSmartNotes]  = useState('')
  const [smartAddr,   setSmartAddr]   = useState('')
  const [genderPref,  setGenderPref]  = useState('Any')
  const [langPref,    setLangPref]    = useState('Any language')
  const [nationality, setNationality] = useState('Any')
  const [matchedNurse, setMatchedNurse] = useState<Nurse | null>(null)
  const [matchedList,  setMatchedList]  = useState<Nurse[]>([])

  // ── Browse & Book state ──────────────────────────────────────────────────
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null)
  const [shiftAvail,    setShiftAvail]    = useState<ShiftAvailMap>({})
  const [browseSearch,  setBrowseSearch]  = useState('')
  const [browseCity,    setBrowseCity]    = useState('All')
  const [browseGender,  setBrowseGender]  = useState('Any')
  const [browseNationality, setBrowseNationality] = useState('Any')
  const [browseLanguage,    setBrowseLanguage]    = useState('Any')
  const [browseShift,     setBrowseShift]     = useState(SHIFTS[0].key)
  const [browseStartTime, setBrowseStartTime] = useState('08:00')
  const [browseEndTime,   setBrowseEndTime]   = useState('10:00')
  const [browseStart,     setBrowseStart]     = useState(nxt(1))
  const [browseEnd,       setBrowseEnd]       = useState(nxt(2))
  const [browseService, setBrowseService] = useState(SERVICES[0])
  const [browseAddr,    setBrowseAddr]    = useState('')
  const [browseNotes,   setBrowseNotes]   = useState('')

  // ── AI Chat state ────────────────────────────────────────────────────────
  type ChatMsg = { role: 'user' | 'ai'; text: string }
  const [chatMsgs,    setChatMsgs]    = useState<ChatMsg[]>([
    { role: 'ai', text: `Hello! I'm your NurseCare booking assistant. 👋\n\nTell me what kind of care you're looking for, and I'll find the best available providers for you. Just describe your situation!` }
  ])
  const [chatInput,   setChatInput]   = useState('')
  const [aiTyping,    setAiTyping]    = useState(false)
  const [aiSuggestion,setAiSuggestion]= useState<Nurse | null>(null)
  const [aiStep,      setAiStep]      = useState(1)
  const [aiShift,     setAiShift]     = useState(SHIFTS[0].key)
  const [aiService,   setAiService]   = useState(SERVICES[0])
  const [aiAddr,      setAiAddr]      = useState('')
  const chatRef    = useRef<HTMLDivElement>(null)
  const bookingFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chatMsgs, aiTyping])

  // Open availability modal for a nurse on a specific date
  async function showAvailability(nurse: Nurse, date: string) {
    setAvailNurse(nurse)
    setAvailDate(date)
    setAvailData(null)
    setAvailLoading(true)
    try {
      const data = await getShiftAvailability(nurse.id, date, date)
      setAvailData((data[date] ?? null) as any)
    } catch { setAvailData(null) }
    setAvailLoading(false)
  }

  // Fetch shift availability when a nurse + date are selected (Browse mode)
  useEffect(() => {
    if (!selectedNurse || !browseStart) return
    getShiftAvailability(selectedNurse.id, browseStart, browseEnd || browseStart)
      .then(data => setShiftAvail(data))
      .catch(() => setShiftAvail({}))
  }, [selectedNurse?.id, browseStart, browseEnd])

  // Smart duration = days between start and end
  const smartDays = Math.max(1, Math.round((new Date(smartEnd).getTime() - new Date(smartStart).getTime()) / 86400000))
  const browseDays = Math.max(1, Math.round((new Date(browseEnd).getTime() - new Date(browseStart).getTime()) / 86400000))

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ── Smart Match logic ────────────────────────────────────────────────────
  const [smartMatchLoading, setSmartMatchLoading] = useState(false)

  async function handleSmartMatch() {
    // Validate minimum booking hours
    const selectedHours = calcHours(smartStartTime, smartEndTime, smartShift)
    if (selectedHours < minBookingHours) {
      setError(`Minimum booking duration is ${minBookingHours} hours. You selected ${selectedHours}h — please adjust the time slot.`)
      return
    }
    setError('')
    setSmartMatchLoading(true)

    let pool = [...allNurses]
    const cityPool = pool.filter(n => n.city === smartCity)
    if (cityPool.length > 0) pool = cityPool
    if (genderPref !== 'Any') {
      const g = genderPref.replace(' Only', '').toLowerCase()
      const gPool = pool.filter(n => n.gender.toLowerCase() === g)
      if (gPool.length > 0) pool = gPool
    }
    if (nationality !== 'Any') {
      const natPool = pool.filter(n => n.nationality.toLowerCase() === nationality.toLowerCase())
      if (natPool.length > 0) pool = natPool
    }

    // Filter by availability on selected date + shift
    const availablePool: Nurse[] = []
    await Promise.all(pool.map(async (n) => {
      try {
        const data = await getShiftAvailability(n.id, smartStart, smartStart)
        const dayData = data[smartStart]
        if (!dayData) return // no availability data — exclude
        const shiftData = dayData[smartShift as ShiftKey]
        // Include nurse only if status is 'available' or 'partial' with enough remaining hours
        if (shiftData?.status === 'available' || (shiftData?.status === 'partial' && (shiftData.remainingHours ?? 0) >= selectedHours)) {
          availablePool.push(n)
        }
      } catch { /* exclude on error */ }
    }))

    setSmartMatchLoading(false)
    setMatchedList(availablePool)
    setMatchedNurse(availablePool[0] ?? null)
    setStep(2)
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function submitBooking(formData: FormData) {
    return new Promise<void>((resolve) => {
      startT(async () => {
        try {
          const result = await submitBookingAction(formData) as any
          if (result?.error) setError(result.error)
          else { setBookingRef(result?.bookingRef ?? ''); setSessions(result?.sessions ?? 1); setSuccess(true) }
        } catch (e: any) {
          setError(e?.message ?? 'Something went wrong. Please try again.')
        }
        resolve()
      })
    })
  }

  // ── AI Chat ──────────────────────────────────────────────────────────────
  function sendAiMsg(text?: string) {
    const msg = (text ?? chatInput).trim()
    if (!msg) return
    setChatInput('')
    setChatMsgs(p => [...p, { role: 'user', text: msg }])
    setAiTyping(true)
    setTimeout(() => {
      setAiTyping(false)
      const lower = msg.toLowerCase()
      const found = AI_RESPONSES.find(r => r.triggers.some(t => lower.includes(t)))
      setChatMsgs(p => [...p, { role: 'ai', text: found?.reply ?? AI_FALLBACK }])
      if (!aiSuggestion && chatMsgs.length >= 2) {
        const femaleFirst = allNurses.filter(n => n.gender === 'female')
        setAiSuggestion(femaleFirst[0] ?? allNurses[0])
      }
    }, 900 + Math.random() * 500)
  }

  // ── Colors ───────────────────────────────────────────────────────────────
  const MC: Record<Mode, string> = { smart:'#006D7A', browse:'#C5880F', ai:'#6B3FA0' }
  const modeSteps: Record<Mode, string[]> = {
    smart:  ['Your Needs', 'Matched Providers', 'Confirm & Book'],
    browse: ['Choose Provider', 'Fill Details', 'Confirm & Book'],
    ai:     ['Chat', 'Review', 'Confirm'],
  }

  // ── Filtered browse nurses ────────────────────────────────────────────────
  const filteredBrowse = allNurses.filter(n =>
    (browseCity        === 'All' || n.city === browseCity) &&
    (browseGender      === 'Any' || n.gender.toLowerCase() === browseGender.toLowerCase()) &&
    (browseNationality === 'Any' || n.nationality.toLowerCase() === browseNationality.toLowerCase()) &&
    (browseLanguage    === 'Any' || (n.languages ?? []).some(l => l.toLowerCase() === browseLanguage.toLowerCase())) &&
    (browseSearch === '' || n.name.toLowerCase().includes(browseSearch.toLowerCase()) || n.specialization.toLowerCase().includes(browseSearch.toLowerCase()))
  )

  // ── SUCCESS ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ textAlign:'center', padding:'5rem 2rem' }}>
        <div style={{ width:90,height:90,borderRadius:'50%',background:'#E6F7F1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem',margin:'0 auto 1.5rem',boxShadow:'0 0 0 14px rgba(26,122,74,0.08)' }}>✅</div>
        <h2 style={{ fontFamily:'Georgia,serif',fontSize:'1.9rem',color:'var(--ink)',fontWeight:400,marginBottom:'0.5rem' }}>Booking Saved!</h2>
        <p style={{ color:'var(--muted)',fontSize:'0.9rem',maxWidth:440,margin:'0 auto 1.5rem',lineHeight:1.7 }}>
          {sessions > 1
            ? `${sessions} sessions have been submitted. Once a nurse accepts your booking, you will see a Pay Now button in My Bookings.`
            : 'Your booking has been submitted. Once a nurse accepts, you will see a Pay Now button in My Bookings to complete payment.'}
        </p>
        <div style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(14,123,140,0.06)',border:'1px solid rgba(14,123,140,0.15)',borderRadius:10,padding:'10px 20px',fontFamily:'monospace',fontSize:'0.95rem',fontWeight:700,color:'#0E7B8C',marginBottom:'1.5rem' }}>
          📋 Booking Ref: {bookingRef || `NC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random()*90000)}`}
        </div>
        <div style={{ display:'flex',gap:'0.8rem',justifyContent:'center',flexWrap:'wrap' }}>
          <a href="/patient/bookings" style={{ background:'linear-gradient(135deg,#0E7B8C,#0ABFCC)',color:'#fff',padding:'11px 24px',borderRadius:10,fontWeight:700,textDecoration:'none',fontSize:'0.9rem' }}>View My Bookings</a>
          <button onClick={() => { setSuccess(false); setMode(null); setStep(1) }} style={{ background:'var(--shell-bg)',color:'var(--ink)',padding:'11px 24px',borderRadius:10,fontWeight:600,border:'1px solid var(--border)',cursor:'pointer',fontSize:'0.9rem',fontFamily:'inherit' }}>Book Another</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh' }}>

      {/* ── Hero ── */}
      <div style={{ background:'linear-gradient(135deg,#004A54 0%,#006D7A 55%,#00838F 100%)',padding:'3rem 2rem 3.5rem',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-80,right:-60,width:300,height:300,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none' }} />
        <div style={{ maxWidth:600,position:'relative',zIndex:1 }}>
          <div style={{ display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:100,padding:'5px 14px',fontSize:'0.72rem',fontWeight:600,color:'rgba(255,255,255,0.85)',marginBottom:'1rem',letterSpacing:'0.05em' }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:'#4ADE80',display:'inline-block' }} />
            Booking System · 3 Ways to Book
          </div>
          <h1 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(28px,4vw,44px)',color:'#fff',lineHeight:1.1,marginBottom:'0.75rem',fontWeight:400 }}>
            Book Your <em style={{ fontStyle:'italic',color:'rgba(255,255,255,0.7)' }}>Home Healthcare</em> Provider
          </h1>
          <p style={{ fontSize:'0.88rem',color:'rgba(255,255,255,0.6)',lineHeight:1.7 }}>
            Choose how you'd like to find and book your care — fill a form, browse providers, or let our AI assistant help.
          </p>
        </div>
      </div>

      {/* ── Mode cards ── */}
      <div style={{ padding:'0 1.5rem',marginTop:-28,position:'relative',zIndex:10,marginBottom:'2rem' }}>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14 }}>
          {([
            { key:'smart'  as Mode, num:'01', icon:'🎯', label:'Smart Match',   desc:'Fill your requirements and we find the best available providers automatically.',        badge:'⚡ Recommended',     color:'#006D7A', badgeBg:'rgba(0,109,122,0.1)' },
            { key:'browse' as Mode, num:'02', icon:'🔍', label:'Browse & Book', desc:'See all available nurses, browse their profiles, then fill in your booking details.',  badge:'👁 Most Control',    color:'#C5880F', badgeBg:'rgba(197,136,15,0.1)' },
            { key:'ai'     as Mode, num:'03', icon:'🤖', label:'AI Assistant',  desc:'Describe what you need in everyday language — our AI understands and books for you.',   badge:'✨ Natural Language', color:'#6B3FA0', badgeBg:'rgba(107,63,160,0.1)' },
          ]).map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setStep(1) }} style={{ background:'var(--card)',borderRadius:18,textAlign:'left',padding:'20px 18px',cursor:'pointer',fontFamily:'inherit',border:`2px solid ${mode===m.key?m.color:'var(--border)'}`,boxShadow:mode===m.key?`0 10px 32px rgba(0,0,0,0.12)`:'0 4px 16px rgba(0,0,0,0.06)',transform:mode===m.key?'translateY(-4px)':'none',transition:'all 0.25s cubic-bezier(.34,1.3,.64,1)',position:'relative',overflow:'hidden' }}>
              {mode===m.key && <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:m.color,borderRadius:'18px 18px 0 0' }} />}
              {mode===m.key && <div style={{ position:'absolute',top:14,right:14,width:22,height:22,borderRadius:'50%',background:m.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'0.7rem',fontWeight:800 }}>✓</div>}
              <div style={{ fontSize:'0.65rem',fontWeight:600,color:'rgba(0,0,0,0.35)',letterSpacing:'0.1em',marginBottom:10 }}>{m.num} / 03</div>
              <div style={{ width:48,height:48,borderRadius:13,fontSize:'1.4rem',display:'flex',alignItems:'center',justifyContent:'center',background:m.badgeBg,marginBottom:12 }}>{m.icon}</div>
              <div style={{ fontWeight:700,fontSize:'1rem',color:'var(--ink)',marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:'0.78rem',color:'var(--muted)',lineHeight:1.6,marginBottom:12 }}>{m.desc}</div>
              <div style={{ display:'inline-flex',alignItems:'center',gap:5,background:m.badgeBg,color:m.color,fontSize:'0.68rem',fontWeight:700,padding:'3px 9px',borderRadius:6 }}>{m.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Panel ── */}
      {mode && (
        <div style={{ padding:'0 1.5rem 6rem' }}>

          {/* Stepper */}
          <div style={{ display:'flex',alignItems:'center',marginBottom:'1.8rem' }}>
            {modeSteps[mode].map((label, i) => {
              const n = i+1; const done = n < step; const active = n === step
              const color = MC[mode]
              return (
                <div key={label} style={{ display:'flex',alignItems:'center',flex:1 }}>
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:5 }}>
                    <div style={{ width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.78rem',background:done||active?color:'var(--shell-bg)',color:done||active?'#fff':'var(--muted)',border:`2px solid ${done||active?color:'var(--border)'}`,boxShadow:active?`0 0 0 4px ${color}22`:'none',transition:'all 0.3s' }}>{done?'✓':n}</div>
                    <div style={{ fontSize:'0.65rem',fontWeight:600,color:active?color:'var(--muted)',textAlign:'center',maxWidth:72,lineHeight:1.3 }}>{label}</div>
                  </div>
                  {i < modeSteps[mode].length-1 && <div style={{ flex:1,height:2,background:done?color:'var(--border)',margin:'0 6px',marginBottom:16,transition:'background 0.3s' }} />}
                </div>
              )
            })}
          </div>

          {/* ════ SMART MATCH ════ */}
          {mode==='smart' && (
            <>
              {step===1 && (
                <div style={{ maxWidth:680 }}>
                  <BookCard icon="🏥" title="Care Requirements" sub="Tell us what type of care you need" color="#006D7A">
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:20 }}>
                      <Field label="Type of Care">
                        <select className="form-input" value={careType} onChange={e=>setCareType(e.target.value)} style={{ fontSize:'0.88rem' }}>
                          {SERVICES.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="City">
                        <select className="form-input" value={smartCity} onChange={e=>setSmartCity(e.target.value)} style={{ fontSize:'0.88rem' }}>
                          {availableCities.length > 0
                            ? availableCities.map(c=><option key={c}>{c}</option>)
                            : CITIES.map(c=><option key={c}>{c}</option>)
                          }
                        </select>
                      </Field>
                    </div>

                    <Field label="Care is for">
                      <select className="form-input" value={careFor} onChange={e=>setCareFor(e.target.value)} style={{ fontSize:'0.88rem',marginTop:4 }}>
                        {CARE_FOR.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </Field>

                    <div style={{ height:1,background:'var(--border)',margin:'16px 0' }} />

                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14 }}>
                      <Field label="Provider Language">
                        <select className="form-input" value={langPref} onChange={e=>setLangPref(e.target.value)} style={{ fontSize:'0.88rem',marginTop:4 }}>
                          <option value="Any language">Any language</option>
                          {languageOptions.map(l=><option key={l}>{l}</option>)}
                        </select>
                      </Field>

                      <Field label="Provider Gender">
                        <select className="form-input" value={genderPref} onChange={e=>setGenderPref(e.target.value)} style={{ fontSize:'0.88rem',marginTop:4 }}>
                          {genderOptions.map(g=><option key={g}>{g}</option>)}
                        </select>
                      </Field>

                      <Field label="Provider Nationality">
                        <select className="form-input" value={nationality} onChange={e=>setNationality(e.target.value)} style={{ fontSize:'0.88rem',marginTop:4 }}>
                          {nationalityOptions.map(n=><option key={n}>{n}</option>)}
                        </select>
                      </Field>
                    </div>

                    <div style={{ marginTop:16 }}>
                      <Field label="Additional Notes">
                        <textarea className="form-input" rows={2} value={smartNotes} onChange={e=>setSmartNotes(e.target.value)} placeholder="e.g. Patient has diabetes, requires gentle handling..." style={{ resize:'vertical',fontSize:'0.85rem' }} />
                      </Field>
                    </div>
                  </BookCard>

                  <BookCard icon="📅" title="When do you need care?" sub="Set your preferred schedule" color="#006D7A">
                    {/* Booking Type */}
                    <Field label="Booking Type">
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:6,marginBottom:16 }}>
                        {([['one_time','📅','One-Time','Single session'],['weekly','🔁','Weekly','Pick days/week'],['monthly','📆','Monthly','Same day each month']] as const).map(([val,icon,label,sub])=>(
                          <div key={val} onClick={()=>setBookingType(val as any)} style={{ border:`1.5px solid ${bookingType===val?'#006D7A':'var(--border)'}`,background:bookingType===val?'rgba(0,109,122,0.07)':'var(--cream)',borderRadius:10,padding:'10px 8px',textAlign:'center',cursor:'pointer',transition:'all 0.15s' }}>
                            <div style={{ fontSize:'1.2rem',marginBottom:3 }}>{icon}</div>
                            <div style={{ fontSize:'0.78rem',fontWeight:700,color:bookingType===val?'#006D7A':'var(--ink)' }}>{label}</div>
                            <div style={{ fontSize:'0.65rem',color:'var(--muted)',marginTop:1 }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                    </Field>

                    <div style={{ display:'grid',gridTemplateColumns:bookingType==='one_time'?'1fr':'1fr 1fr',gap:14,marginBottom:20 }}>
                      <Field label="Start Date">
                        <input type="date" className="form-input" value={smartStart} min={nxt(1)} onChange={e=>{ setSmartStart(e.target.value); if(e.target.value>=smartEnd)setSmartEnd(e.target.value) }} />
                      </Field>
                      {bookingType!=='one_time' && (
                        <Field label="End Date">
                          <input type="date" className="form-input" value={smartEnd} min={smartStart} onChange={e=>setSmartEnd(e.target.value)} />
                        </Field>
                      )}
                    </div>

                    {/* Days of week for weekly */}
                    {bookingType==='weekly' && (
                      <div style={{ marginBottom:16 }}>
                        <Field label="Days of the Week">
                          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:6 }}>
                            {WEEKDAYS.map((day,i)=>(
                              <div key={i} onClick={()=>toggleDay(i)} style={{ width:42,height:42,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:`1.5px solid ${selectedDays.includes(i)?'#006D7A':'var(--border)'}`,background:selectedDays.includes(i)?'#006D7A':'var(--cream)',color:selectedDays.includes(i)?'#fff':'var(--ink)',fontSize:'0.72rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s' }}>{day}</div>
                            ))}
                          </div>
                          <div style={{ fontSize:'0.7rem',color:'var(--muted)',marginTop:4 }}>{selectedDays.length===0?'Select at least one day':`${selectedDays.length} day${selectedDays.length>1?'s':''} selected`}</div>
                        </Field>
                      </div>
                    )}

                    {bookingType==='one_time' && (
                      <div style={{ fontSize:'0.78rem',color:'#006D7A',fontWeight:600,marginBottom:16 }}>
                        📅 Duration: {smartDays} day{smartDays>1?'s':''}
                      </div>
                    )}
                    {bookingType!=='one_time' && (
                      <div style={{ fontSize:'0.78rem',color:'#006D7A',fontWeight:600,marginBottom:16 }}>
                        📅 {bookingType==='weekly'?'Weekly':'Monthly'} · {smartStart} → {smartEnd}
                      </div>
                    )}

                    <Field label="Preferred Shift">
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:8 }}>
                        {SHIFTS.map(s=><ShiftCard key={s.key} shift={s} active={smartShift===s.key} onClick={()=>{
                          setSmartShift(s.key)
                          const b = SHIFT_BOUNDS[s.key]
                          setSmartStartTime(`${String(b.startH).padStart(2,'0')}:00`)
                          setSmartEndTime(`${String(Math.min(b.startH + minBookingHours, b.endH === 24 ? 0 : b.endH)).padStart(2,'0')}:00`)
                        }} />)}
                      </div>
                      <TimeSlotPicker
                        shift={smartShift}
                        startTime={smartStartTime}
                        endTime={smartEndTime}
                        onStartChange={setSmartStartTime}
                        onEndChange={setSmartEndTime}
                        minHours={minBookingHours}
                      />
                    </Field>
                  </BookCard>
                  {error && <div className="auth-error" style={{ marginTop:'0.5rem' }}><span>⚠️</span> {error}</div>}
                </div>
              )}

              {step===2 && (
                <div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10 }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:'0.95rem',color:'var(--ink)' }}>{matchedList.length} providers found</div>
                      <div style={{ fontSize:'0.8rem',color:'var(--muted)' }}>{careType} · {SHIFTS.find(s=>s.key===smartShift)?.label} Shift · {smartCity}</div>
                    </div>
                  </div>
                  {matchedList.length === 0 ? (
                    <div className="dash-card" style={{ padding:'2.5rem',textAlign:'center' }}>
                      <div style={{ fontSize:'2rem',marginBottom:'0.75rem' }}>😔</div>
                      <div style={{ fontWeight:700,fontSize:'0.95rem',color:'var(--ink)',marginBottom:6 }}>No available nurses found</div>
                      <div style={{ fontSize:'0.82rem',color:'var(--muted)',marginBottom:'1.2rem' }}>
                        No nurses are available for <strong>{SHIFTS.find(s=>s.key===smartShift)?.label} shift</strong> on <strong>{smartStart}</strong> in <strong>{smartCity}</strong>.<br />Try a different date, shift, or city.
                      </div>
                      <button onClick={()=>setStep(1)} style={{ padding:'9px 20px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--cream)',color:'var(--ink)',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',fontFamily:'inherit' }}>← Change Search</button>
                    </div>
                  ) : (
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16 }}>
                      {matchedList.map(n=>(
                        <NurseCard key={n.id} nurse={n} selected={matchedNurse?.id===n.id}
                          onSelect={()=>{setMatchedNurse(n);showToast(`${n.name} selected!`)}}
                          onViewDetails={()=>setDetailNurse(n)}
                          onViewAvailability={()=>showAvailability(n, smartStart)}
                          color="#006D7A" showMatch patientRate={patientRate} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step===3 && matchedNurse && (
                <form ref={bookingFormRef} action={submitBooking} style={{ maxWidth:600 }}>
                  <input type="hidden" name="user_id"           value={userId} />
                  <input type="hidden" name="user_name"         value={userName} />
                  <input type="hidden" name="user_email"        value={userEmail} />
                  <input type="hidden" name="service_type"      value={careType} />
                  <input type="hidden" name="patient_condition" value={`${careFor} · ${careType}`} />
                  <input type="hidden" name="city"              value={smartCity} />
                  <input type="hidden" name="shift"             value={smartShift} />
                  <input type="hidden" name="start_date"        value={smartStart} />
                  <input type="hidden" name="end_date"          value={smartEnd} />
                  <input type="hidden" name="booking_type"      value={bookingType} />
                  <input type="hidden" name="address"           value={smartAddr||`${smartCity}`} />
                  <input type="hidden" name="notes"             value={smartNotes} />
                  <input type="hidden" name="nurse_id"          value={matchedNurse.id} />
                  <input type="hidden" name="nurse_name"        value={matchedNurse.name} />
                  <input type="hidden" name="hourly_rate"       value={patientRate(matchedNurse.hourlyRate)} />
                  <input type="hidden" name="duration"          value={calcHours(smartStartTime, smartEndTime, smartShift)} />
                  {selectedDays.map(d=><input key={d} type="hidden" name="days_of_week" value={d} />)}

                  <SelectedBanner nurse={matchedNurse} emoji={nurseEmoji(matchedNurse)} color="#006D7A" nationality={matchedNurse.nationality} gender={matchedNurse.gender} onChangeFn={()=>{setMatchedNurse(null);setStep(2)}} />
                  {error && <div className="auth-error" style={{ marginBottom:'1rem' }}><span>⚠️</span> {error}</div>}

                  <BookCard icon="📋" title="Review & Confirm" sub="Finalise your booking details" color="#006D7A">
                    <ConfirmSummary rows={[
                      ['Provider',     matchedNurse.name],
                      ['Nationality',  matchedNurse.nationality||'—'],
                      ['Care Type',    careType],
                      ['Care For',     careFor],
                      ['City',         smartCity],
                      ['Shift',        `${SHIFTS.find(s=>s.key===smartShift)?.label} (${SHIFTS.find(s=>s.key===smartShift)?.time})`],
                      ['Booking Type', bookingType==='one_time'?'One-Time':bookingType==='weekly'?'Weekly':'Monthly'],
                      ['Start Date',   smartStart],
                      ...(bookingType!=='one_time'?[['End Date',smartEnd] as [string,string]]:[]),
                      ...(bookingType==='weekly'?[['Days',selectedDays.map(d=>WEEKDAYS[d]).join(', ')] as [string,string]]:[]),
                      ['Duration',     `${smartDays} day${smartDays>1?'s':''}`],
                    ]} />
                    <PriceBreakdown rate={patientRate(matchedNurse.hourlyRate)} hours={calcHours(smartStartTime, smartEndTime, smartShift)} vatRate={vatRate} />
                  </BookCard>

                  <Field label="Full Address *">
                    <div style={{ display:'flex', gap:8 }}>
                      <input className="form-input" value={smartAddr} onChange={e=>setSmartAddr(e.target.value)} placeholder="Street, district, building number" required style={{ fontSize:'0.88rem', flex:1 }} />
                      <LocationBtn onAddress={setSmartAddr} />
                    </div>
                  </Field>
                </form>
              )}
            </>
          )}

          {/* ════ BROWSE & BOOK ════ */}
          {mode==='browse' && (
            <>
              {step===1 && (
                <div>
                  {/* Filters — all from DB */}
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:14 }}>
                    <select className="form-input" value={browseCity} onChange={e=>setBrowseCity(e.target.value)} style={{ fontSize:'0.85rem' }}>
                      <option value="All">All Cities</option>
                      {availableCities.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <select className="form-input" value={browseGender} onChange={e=>setBrowseGender(e.target.value)} style={{ fontSize:'0.85rem' }}>
                      <option value="Any">Any Gender</option>
                      {availableGenders.map(g=>(
                        <option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>
                      ))}
                    </select>
                    <select className="form-input" value={browseNationality} onChange={e=>setBrowseNationality(e.target.value)} style={{ fontSize:'0.85rem' }}>
                      <option value="Any">Any Nationality</option>
                      {availableNationalities.map(n=><option key={n}>{n}</option>)}
                    </select>
                    <select className="form-input" value={browseLanguage} onChange={e=>setBrowseLanguage(e.target.value)} style={{ fontSize:'0.85rem' }}>
                      <option value="Any">Any Language</option>
                      {languageOptions.map(l=><option key={l}>{l}</option>)}
                    </select>
                    <input type="text" className="form-input" value={browseSearch} onChange={e=>setBrowseSearch(e.target.value)} placeholder="🔍 Search by name..." style={{ fontSize:'0.85rem' }} />
                  </div>
                  <div style={{ fontSize:'0.8rem',color:'var(--muted)',marginBottom:12 }}>Showing {filteredBrowse.length} of {allNurses.length} providers</div>
                  {filteredBrowse.length === 0 ? (
                    <div className="dash-card" style={{ padding:'2rem',textAlign:'center' }}>
                      <div style={{ fontSize:'2rem',marginBottom:8 }}>🔍</div>
                      <div style={{ fontWeight:700,color:'var(--ink)' }}>No providers found</div>
                      <div style={{ fontSize:'0.82rem',color:'var(--muted)',marginTop:4 }}>Try adjusting your filters</div>
                    </div>
                  ) : (
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16 }}>
                      {filteredBrowse.map(n=>(
                        <NurseCard key={n.id} nurse={n} selected={selectedNurse?.id===n.id}
                          onSelect={()=>{setSelectedNurse(n);showToast(`${n.name} selected!`)}}
                          onViewDetails={()=>setDetailNurse(n)}
                          onViewAvailability={()=>showAvailability(n, browseStart)}
                          color="#C5880F" patientRate={patientRate} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step===2 && selectedNurse && (
                <div style={{ maxWidth:600 }}>
                  <SelectedBanner nurse={selectedNurse} emoji={nurseEmoji(selectedNurse)} color="#C5880F" nationality={selectedNurse.nationality} gender={selectedNurse.gender} onChangeFn={()=>{setSelectedNurse(null);setStep(1)}} />
                  <BookCard icon="📅" title="Booking Details" sub="When and how long do you need care?" color="#C5880F">
                    {/* Booking Type */}
                    <Field label="Booking Type">
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:6,marginBottom:16 }}>
                        {([['one_time','📅','One-Time','Single session'],['weekly','🔁','Weekly','Pick days/week'],['monthly','📆','Monthly','Same day each month']] as const).map(([val,icon,label,sub])=>(
                          <div key={val} onClick={()=>setBookingType(val as any)} style={{ border:`1.5px solid ${bookingType===val?'#C5880F':'var(--border)'}`,background:bookingType===val?'rgba(197,136,15,0.07)':'var(--cream)',borderRadius:10,padding:'10px 8px',textAlign:'center',cursor:'pointer',transition:'all 0.15s' }}>
                            <div style={{ fontSize:'1.2rem',marginBottom:3 }}>{icon}</div>
                            <div style={{ fontSize:'0.78rem',fontWeight:700,color:bookingType===val?'#C5880F':'var(--ink)' }}>{label}</div>
                            <div style={{ fontSize:'0.65rem',color:'var(--muted)',marginTop:1 }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                    </Field>

                    <div style={{ display:'grid',gridTemplateColumns:bookingType==='one_time'?'1fr':'1fr 1fr',gap:14,marginBottom:20 }}>
                      <Field label="Start Date">
                        <input type="date" className="form-input" value={browseStart} min={nxt(1)} onChange={e=>{ setBrowseStart(e.target.value); if(e.target.value>=browseEnd)setBrowseEnd(e.target.value) }} />
                      </Field>
                      {bookingType!=='one_time' && (
                        <Field label="End Date">
                          <input type="date" className="form-input" value={browseEnd} min={browseStart} onChange={e=>setBrowseEnd(e.target.value)} />
                        </Field>
                      )}
                    </div>

                    {/* Days of week for weekly */}
                    {bookingType==='weekly' && (
                      <div style={{ marginBottom:16 }}>
                        <Field label="Days of the Week">
                          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:6 }}>
                            {WEEKDAYS.map((day,i)=>(
                              <div key={i} onClick={()=>toggleDay(i)} style={{ width:42,height:42,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:`1.5px solid ${selectedDays.includes(i)?'#C5880F':'var(--border)'}`,background:selectedDays.includes(i)?'#C5880F':'var(--cream)',color:selectedDays.includes(i)?'#fff':'var(--ink)',fontSize:'0.72rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s' }}>{day}</div>
                            ))}
                          </div>
                          <div style={{ fontSize:'0.7rem',color:'var(--muted)',marginTop:4 }}>{selectedDays.length===0?'Select at least one day':`${selectedDays.length} day${selectedDays.length>1?'s':''} selected`}</div>
                        </Field>
                      </div>
                    )}

                    <div style={{ fontSize:'0.78rem',color:'#C5880F',fontWeight:600,marginBottom:16 }}>
                      📅 {bookingType==='one_time'?`Duration: ${browseDays} day${browseDays>1?'s':''}`:bookingType==='weekly'?`Weekly · ${browseStart} → ${browseEnd}`:`Monthly · ${browseStart} → ${browseEnd}`}
                    </div>
                    <Field label="Service Type">
                      <select className="form-input" value={browseService} onChange={e=>setBrowseService(e.target.value)} style={{ fontSize:'0.85rem',marginTop:4 }}>
                        {SERVICES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </Field>
                    <div style={{ marginTop:16 }}>
                      <Field label="Shift Preference">
                        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:8 }}>
                          {SHIFTS.map(s=>{
                            const dayAvail = shiftAvail[browseStart]
                            const st = dayAvail?.[s.key as ShiftKey]?.status ?? null
                            return <ShiftCard key={s.key} shift={s} active={browseShift===s.key} onClick={()=>{
                              setBrowseShift(s.key)
                              const b = SHIFT_BOUNDS[s.key]
                              setBrowseStartTime(`${String(b.startH).padStart(2,'0')}:00`)
                              setBrowseEndTime(`${String(Math.min(b.startH + minBookingHours, b.endH === 24 ? 0 : b.endH)).padStart(2,'0')}:00`)
                            }} availStatus={st} />
                          })}
                        </div>
                        <TimeSlotPicker
                          shift={browseShift}
                          startTime={browseStartTime}
                          endTime={browseEndTime}
                          onStartChange={setBrowseStartTime}
                          onEndChange={setBrowseEndTime}
                          minHours={minBookingHours}
                        />
                      </Field>
                    </div>
                    <div style={{ marginTop:16 }}>
                      <Field label="Special Instructions">
                        <textarea className="form-input" rows={2} value={browseNotes} onChange={e=>setBrowseNotes(e.target.value)} placeholder="Any medical notes or special requests..." style={{ resize:'vertical',fontSize:'0.85rem' }} />
                      </Field>
                    </div>
                  </BookCard>
                </div>
              )}

              {step===3 && selectedNurse && (
                <form ref={bookingFormRef} action={submitBooking} style={{ maxWidth:600 }}>
                  <input type="hidden" name="user_id"           value={userId} />
                  <input type="hidden" name="user_name"         value={userName} />
                  <input type="hidden" name="user_email"        value={userEmail} />
                  <input type="hidden" name="service_type"      value={browseService} />
                  <input type="hidden" name="patient_condition" value="General care" />
                  <input type="hidden" name="city"              value={selectedNurse.city} />
                  <input type="hidden" name="shift"             value={browseShift} />
                  <input type="hidden" name="start_date"        value={browseStart} />
                  <input type="hidden" name="end_date"          value={browseEnd} />
                  <input type="hidden" name="booking_type"      value={bookingType} />
                  <input type="hidden" name="address"           value={browseAddr||selectedNurse.city} />
                  <input type="hidden" name="notes"             value={browseNotes} />
                  <input type="hidden" name="nurse_id"          value={selectedNurse.id} />
                  <input type="hidden" name="nurse_name"        value={selectedNurse.name} />
                  <input type="hidden" name="hourly_rate"       value={patientRate(selectedNurse.hourlyRate)} />
                  <input type="hidden" name="duration"          value={calcHours(browseStartTime, browseEndTime, browseShift)} />
                  {selectedDays.map(d=><input key={d} type="hidden" name="days_of_week" value={d} />)}

                  <SelectedBanner nurse={selectedNurse} emoji={nurseEmoji(selectedNurse)} color="#C5880F" nationality={selectedNurse.nationality} gender={selectedNurse.gender} onChangeFn={()=>setStep(2)} />
                  {error && <div className="auth-error" style={{ marginBottom:'1rem' }}><span>⚠️</span> {error}</div>}

                  <BookCard icon="💳" title="Confirm & Pay" sub="Review your booking" color="#C5880F">
                    <ConfirmSummary rows={[
                      ['Provider',     selectedNurse.name],
                      ['Nationality',  selectedNurse.nationality||'—'],
                      ['Gender',       selectedNurse.gender],
                      ['Service',      browseService],
                      ['Booking Type', bookingType==='one_time'?'One-Time':bookingType==='weekly'?'Weekly':'Monthly'],
                      ['Start Date',   browseStart],
                      ...(bookingType!=='one_time'?[['End Date',browseEnd] as [string,string]]:[]),
                      ...(bookingType==='weekly'?[['Days',selectedDays.map(d=>WEEKDAYS[d]).join(', ')] as [string,string]]:[]),
                      ['Duration',     `${browseDays} day${browseDays>1?'s':''}`],
                      ['Shift',        `${SHIFTS.find(s=>s.key===browseShift)?.label} (${SHIFTS.find(s=>s.key===browseShift)?.time})`],
                    ]} />
                    <PriceBreakdown rate={patientRate(selectedNurse.hourlyRate)} hours={calcHours(browseStartTime, browseEndTime, browseShift)} vatRate={vatRate} />
                  </BookCard>
                  <Field label="Full Address *">
                    <div style={{ display:'flex', gap:8 }}>
                      <input className="form-input" value={browseAddr} onChange={e=>setBrowseAddr(e.target.value)} placeholder="Street, district, building number" required style={{ fontSize:'0.88rem', flex:1 }} />
                      <LocationBtn onAddress={setBrowseAddr} />
                    </div>
                  </Field>
                </form>
              )}
            </>
          )}

          {/* ════ AI ASSISTANT ════ */}
          {mode==='ai' && (
            <>
              {aiStep===1 && (
                <div className="ai-chat-layout">
                  <div>
                    <div style={{ background:'rgba(107,63,160,0.06)',border:'1px solid rgba(107,63,160,0.2)',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
                      <span style={{ fontSize:'1.3rem' }}>✨</span>
                      <div>
                        <div style={{ fontSize:'0.85rem',fontWeight:700,color:'#6B3FA0' }}>AI Booking Assistant</div>
                        <div style={{ fontSize:'0.75rem',color:'#8B6BB5',lineHeight:1.5 }}>Just describe what you need — say "I need a night nurse for my mother in Riyadh next week"</div>
                      </div>
                    </div>
                    <div style={{ background:'var(--card)',borderRadius:18,border:'1px solid var(--border)',overflow:'hidden',height:480,display:'flex',flexDirection:'column' }}>
                      <div style={{ background:'linear-gradient(135deg,#6B3FA0,#5B2D90)',padding:'14px 18px',display:'flex',alignItems:'center',gap:12 }}>
                        <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem' }}>🤖</div>
                        <div>
                          <div style={{ fontSize:'0.88rem',fontWeight:700,color:'#fff' }}>NurseCare AI Assistant</div>
                          <div style={{ display:'flex',alignItems:'center',gap:5,marginTop:2 }}>
                            <span style={{ width:7,height:7,borderRadius:'50%',background:'#4ADE80',display:'inline-block' }} />
                            <span style={{ fontSize:'0.7rem',color:'rgba(255,255,255,0.7)' }}>Online · Powered by AI</span>
                          </div>
                        </div>
                      </div>
                      <div ref={chatRef} style={{ flex:1,overflowY:'auto',padding:'1rem',display:'flex',flexDirection:'column',gap:12 }}>
                        {chatMsgs.map((msg,i)=>(
                          <div key={i} style={{ display:'flex',gap:10,alignItems:'flex-end',flexDirection:msg.role==='user'?'row-reverse':'row' }}>
                            <div style={{ width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,color:'#fff',background:msg.role==='ai'?'linear-gradient(135deg,#6B3FA0,#5B2D90)':'linear-gradient(135deg,#0ABFCC,#0E7B8C)' }}>
                              {msg.role==='ai'?'AI':userName.split(' ').map(w=>w[0]).slice(0,2).join('')}
                            </div>
                            <div style={{ maxWidth:'75%' }}>
                              <div style={{ padding:'10px 14px',borderRadius:14,borderBottomLeftRadius:msg.role==='ai'?4:14,borderBottomRightRadius:msg.role==='user'?4:14,background:msg.role==='ai'?'#F5F0FC':'#6B3FA0',color:msg.role==='ai'?'var(--ink)':'#fff',fontSize:'0.83rem',lineHeight:1.6,whiteSpace:'pre-wrap' }}>{msg.text}</div>
                              <div style={{ fontSize:'0.65rem',color:'var(--muted)',marginTop:3,textAlign:msg.role==='user'?'right':'left' }}>Now</div>
                            </div>
                          </div>
                        ))}
                        {aiTyping && (
                          <div style={{ display:'flex',gap:10,alignItems:'flex-end' }}>
                            <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#6B3FA0,#5B2D90)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,color:'#fff',flexShrink:0 }}>AI</div>
                            <div style={{ background:'#F5F0FC',padding:'12px 16px',borderRadius:'14px 14px 14px 4px',display:'flex',gap:4 }}>
                              {[0,1,2].map(j=><span key={j} style={{ width:7,height:7,borderRadius:'50%',background:'#C4B5F5',display:'inline-block',animation:`bounce 1.2s ${j*0.2}s infinite` }} />)}
                            </div>
                          </div>
                        )}
                      </div>
                      {chatMsgs.length<=2 && (
                        <div style={{ padding:'8px 14px 4px',display:'flex',flexWrap:'wrap',gap:6 }}>
                          {['🏠 I need a home nurse','🦴 Post-surgery care','🧓 Elderly care daily','🤸 Physiotherapy'].map(q=>(
                            <button key={q} onClick={()=>sendAiMsg(q)} style={{ padding:'6px 12px',border:'1.5px solid rgba(107,63,160,0.3)',borderRadius:100,fontSize:'0.72rem',fontWeight:500,color:'#6B3FA0',background:'rgba(107,63,160,0.06)',cursor:'pointer',fontFamily:'inherit' }}>{q}</button>
                          ))}
                        </div>
                      )}
                      <div style={{ borderTop:'1px solid var(--border)',padding:'10px 12px',display:'flex',gap:8,alignItems:'flex-end' }}>
                        <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAiMsg()}}} placeholder='Type your request...' rows={1}
                          style={{ flex:1,padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:12,fontSize:'0.83rem',fontFamily:'inherit',color:'var(--ink)',outline:'none',resize:'none',maxHeight:80,lineHeight:1.5,background:'var(--card)' }} />
                        <button onClick={()=>sendAiMsg()} style={{ width:40,height:40,borderRadius:11,background:'#6B3FA0',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',color:'#fff',flexShrink:0 }}>➤</button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="dash-card" style={{ marginBottom:'1rem' }}>
                      <div className="dash-card-header"><span className="dash-card-title">🎯 AI Suggestions</span></div>
                      <div className="dash-card-body">
                        {aiSuggestion ? (
                          <div>
                            <div style={{ border:'1.5px solid rgba(107,63,160,0.25)',background:'rgba(107,63,160,0.05)',borderRadius:12,padding:14,marginBottom:10 }}>
                              <div style={{ display:'flex',gap:10,marginBottom:10,alignItems:'center' }}>
                                <div style={{ width:42,height:42,borderRadius:11,background:'var(--shell-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',border:'1px solid var(--border)' }}>{nurseEmoji(aiSuggestion)}</div>
                                <div>
                                  <div style={{ fontWeight:700,fontSize:'0.85rem',color:'var(--ink)' }}>{aiSuggestion.name}</div>
                                  <div style={{ fontSize:'0.7rem',color:'var(--muted)' }}>{aiSuggestion.experienceYears} Yrs experience</div>
                                  <div style={{ fontSize:'0.7rem',color:'var(--muted)' }}>{aiSuggestion.nationality} · {aiSuggestion.gender}</div>
                                </div>
                              </div>
                              <div style={{ fontSize:'0.72rem',fontFamily:'monospace',color:'var(--muted)',marginBottom:8 }}>{aiSuggestion.specialization}</div>
                              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10 }}>
                                <span style={{ fontSize:'0.68rem',fontWeight:600,color:'var(--muted)' }}>MOH ✓ Verified</span>
                                <span style={{ fontWeight:700,color:'#6B3FA0',fontSize:'0.85rem' }}>SAR {patientRate(aiSuggestion.hourlyRate)}/hr</span>
                              </div>
                            </div>
                            <button onClick={()=>{setSelectedNurse(aiSuggestion);setAiStep(2)}} style={{ width:'100%',background:'linear-gradient(135deg,#6B3FA0,#5B2D90)',color:'#fff',padding:'10px',borderRadius:9,fontWeight:700,fontSize:'0.83rem',border:'none',cursor:'pointer',fontFamily:'inherit' }}>
                              Proceed to Book →
                            </button>
                          </div>
                        ) : (
                          <div style={{ textAlign:'center',padding:'1.5rem 0',color:'var(--muted)',fontSize:'0.82rem' }}>
                            <div style={{ fontSize:'1.8rem',marginBottom:8 }}>💬</div>
                            Start chatting and suggestions will appear here
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-header"><span className="dash-card-title">💡 Try saying...</span></div>
                      <div className="dash-card-body" style={{ display:'flex',flexDirection:'column',gap:8 }}>
                        {['"I need a female ICU nurse in Riyadh for 5 days"','"Book a physiotherapist in Jeddah for 3 sessions"','"My mother needs an elderly caregiver every morning"'].map(p=>(
                          <button key={p} onClick={()=>sendAiMsg(p.replace(/['"]/g,''))} style={{ background:'rgba(107,63,160,0.06)',border:'1px solid rgba(107,63,160,0.15)',borderRadius:10,padding:'10px 12px',fontSize:'0.75rem',color:'#6B3FA0',lineHeight:1.5,cursor:'pointer',textAlign:'left',fontFamily:'inherit' }}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {aiStep===2 && selectedNurse && (
                <div style={{ maxWidth:560 }}>
                  <SelectedBanner nurse={selectedNurse} emoji={nurseEmoji(selectedNurse)} color="#6B3FA0" nationality={selectedNurse.nationality} gender={selectedNurse.gender} onChangeFn={()=>{setSelectedNurse(null);setAiStep(1)}} />
                  <BookCard icon="📅" title="Review Details" sub="Confirm schedule for AI recommendation" color="#6B3FA0">
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16 }}>
                      <Field label="Start Date"><input type="date" className="form-input" value={browseStart} min={nxt(1)} onChange={e=>setBrowseStart(e.target.value)} /></Field>
                      <Field label="Service">
                        <select className="form-input" value={aiService} onChange={e=>setAiService(e.target.value)} style={{ fontSize:'0.85rem' }}>
                          {SERVICES.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Shift">
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:8 }}>
                        {SHIFTS.map(s=><ShiftCard key={s.key} shift={s} active={aiShift===s.key} onClick={()=>setAiShift(s.key)} />)}
                      </div>
                    </Field>
                    <div style={{ marginTop:16 }}>
                      <Field label="Full Address *"><input className="form-input" value={aiAddr} onChange={e=>setAiAddr(e.target.value)} placeholder="Street, district, building number" style={{ fontSize:'0.85rem' }} /></Field>
                    </div>
                  </BookCard>
                </div>
              )}

              {aiStep===3 && selectedNurse && (
                <form ref={bookingFormRef} action={submitBooking} style={{ maxWidth:560 }}>
                  <input type="hidden" name="user_id"           value={userId} />
                  <input type="hidden" name="user_name"         value={userName} />
                  <input type="hidden" name="user_email"        value={userEmail} />
                  <input type="hidden" name="service_type"      value={aiService} />
                  <input type="hidden" name="patient_condition" value="General care" />
                  <input type="hidden" name="city"              value={selectedNurse.city} />
                  <input type="hidden" name="shift"             value={aiShift} />
                  <input type="hidden" name="start_date"        value={browseStart} />
                  <input type="hidden" name="end_date"          value={browseStart} />
                  <input type="hidden" name="booking_type"      value={bookingType} />
                  <input type="hidden" name="address"           value={aiAddr||selectedNurse.city} />
                  <input type="hidden" name="notes"             value="" />
                  <input type="hidden" name="nurse_id"          value={selectedNurse.id} />
                  <input type="hidden" name="nurse_name"        value={selectedNurse.name} />
                  <input type="hidden" name="hourly_rate"       value={patientRate(selectedNurse.hourlyRate)} />
                  <input type="hidden" name="duration"          value="8" />
                  {selectedDays.map(d=><input key={d} type="hidden" name="days_of_week" value={d} />)}

                  <SelectedBanner nurse={selectedNurse} emoji={nurseEmoji(selectedNurse)} color="#6B3FA0" nationality={selectedNurse.nationality} gender={selectedNurse.gender} onChangeFn={()=>setAiStep(2)} />
                  {error && <div className="auth-error" style={{ marginBottom:'1rem' }}><span>⚠️</span> {error}</div>}
                  <BookCard icon="💳" title="Confirm Booking" sub="Review AI recommendation" color="#6B3FA0">
                    <ConfirmSummary rows={[
                      ['Provider',    selectedNurse.name],
                      ['Nationality', selectedNurse.nationality||'—'],
                      ['Service',     aiService],
                      ['Date',        browseStart],
                      ['Shift',       SHIFTS.find(s=>s.key===aiShift)?.label??aiShift],
                    ]} />
                    <PriceBreakdown rate={patientRate(selectedNurse.hourlyRate)} hours={8} vatRate={vatRate} />
                  </BookCard>
                </form>
              )}
            </>
          )}

          {/* ── Sticky Bottom Bar ── */}
          <div style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:90,background:'var(--card)',backdropFilter:'blur(12px)',borderTop:'1px solid var(--border)',padding:'14px 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,boxShadow:'0 -4px 20px rgba(0,0,0,0.07)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:14 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:'0.82rem',fontWeight:600,color:'var(--ink)' }}>
                <div style={{ width:9,height:9,borderRadius:'50%',background:MC[mode] }} />
                {mode==='smart'?'Smart Match':mode==='browse'?'Browse & Book':'AI Assistant'}
              </div>
              <div>
                <div style={{ fontSize:'0.68rem',color:'var(--muted)',marginBottom:3 }}>
                  {mode==='ai'?`Step ${aiStep} of 3`:`Step ${step} of 3`}
                </div>
                <div style={{ width:140,height:5,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                  <div style={{ height:'100%',borderRadius:3,background:MC[mode],width:`${((mode==='ai'?aiStep:step)/3)*100}%`,transition:'width 0.4s' }} />
                </div>
              </div>
            </div>
            <div style={{ display:'flex',gap:10,alignItems:'center' }}>
              {((mode!=='ai'&&step>1)||(mode==='ai'&&aiStep>1)) && (
                <button onClick={()=>mode==='ai'?setAiStep(s=>s-1):setStep(s=>s-1)} style={{ padding:'10px 20px',borderRadius:10,background:'none',border:'1.5px solid var(--border)',color:'var(--ink)',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',fontFamily:'inherit' }}>← Back</button>
              )}
              <BottomNextBtn mode={mode} step={step} aiStep={aiStep} color={MC[mode]} smartMatchLoading={smartMatchLoading}
                onNext={()=>{
                  if(mode==='smart'){
                    if(step===1) handleSmartMatch()
                    else if(step===2){if(!matchedNurse){showToast('Please select a provider');return}setStep(3)}
                    else{ if(!smartAddr){showToast('Please enter your address');return} bookingFormRef.current?.requestSubmit() }
                  } else if(mode==='browse'){
                    if(step===1){if(!selectedNurse){showToast('Please select a provider');return}setStep(2)}
                    else if(step===2){
                      const bHours = calcHours(browseStartTime, browseEndTime, browseShift)
                      if(bHours < minBookingHours){ setError(`Minimum booking duration is ${minBookingHours} hours. You selected ${bHours}h — please adjust the time slot.`); return }
                      setError('')
                      setStep(3)
                    }
                    else{ if(!browseAddr){showToast('Please enter your address');return} bookingFormRef.current?.requestSubmit() }
                  } else {
                    if(aiStep===1){if(!aiSuggestion){showToast('Chat with AI first');return}setSelectedNurse(aiSuggestion);setAiStep(2)}
                    else if(aiStep===2){if(!aiAddr){showToast('Please enter your address');return}setAiStep(3)}
                    else{ bookingFormRef.current?.requestSubmit() }
                  }
                }}
                isPending={isPending}
                selectedNurse={mode==='browse'?selectedNurse:null}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:80,right:24,zIndex:200,background:'#0C1E26',color:'#fff',padding:'12px 18px',borderRadius:12,fontSize:'0.83rem',fontWeight:500,display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 28px rgba(0,0,0,0.25)',animation:'slideIn 0.3s ease' }}>
          ✅ {toast}
        </div>
      )}

      {/* ── Nurse Availability Modal ── */}
      {availNurse && (
        <div onClick={()=>setAvailNurse(null)} style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--card)',borderRadius:20,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden' }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,var(--teal),#0ABFCC)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div>
                <div style={{ color:'#fff',fontWeight:700,fontSize:'0.95rem' }}>📅 Availability</div>
                <div style={{ color:'rgba(255,255,255,0.8)',fontSize:'0.75rem',marginTop:2 }}>
                  {availNurse.name} · {availDate}
                </div>
              </div>
              <button onClick={()=>setAvailNurse(null)} style={{ background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',width:30,height:30,borderRadius:8,cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit' }}>✕</button>
            </div>

            <div style={{ padding:'20px' }}>
              {availLoading ? (
                <div style={{ textAlign:'center',padding:'2rem',color:'var(--muted)',fontSize:'0.85rem' }}>Loading availability…</div>
              ) : !availData ? (
                <div style={{ textAlign:'center',padding:'2rem' }}>
                  <div style={{ fontSize:'2rem',marginBottom:'0.5rem' }}>📭</div>
                  <div style={{ color:'var(--muted)',fontSize:'0.85rem' }}>No availability data for this date.</div>
                  <div style={{ color:'var(--muted)',fontSize:'0.75rem',marginTop:4 }}>This nurse may not have set their schedule yet.</div>
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }}>
                  {([
                    { key:'morning' as ShiftKey, icon:'🌅', label:'Morning', time:'08:00 – 16:00', startH:8  },
                    { key:'evening' as ShiftKey, icon:'🌆', label:'Evening', time:'16:00 – 00:00', startH:16 },
                    { key:'night'   as ShiftKey, icon:'🌙', label:'Night',   time:'00:00 – 08:00', startH:0  },
                  ]).map(s => {
                    const info = availData[s.key]
                    if (!info || info.status === 'off') return (
                      <div key={s.key} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--cream)',borderRadius:10,border:'1px solid var(--border)',opacity:0.5 }}>
                        <span style={{ fontSize:'1.2rem' }}>{s.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600,fontSize:'0.85rem',color:'var(--muted)' }}>{s.label}</div>
                          <div style={{ fontSize:'0.7rem',color:'var(--muted)',marginTop:1 }}>{s.time}</div>
                        </div>
                        <span style={{ fontSize:'0.72rem',color:'var(--muted)',fontWeight:600 }}>Not Available</span>
                      </div>
                    )

                    const isBooked  = info.status === 'booked'
                    const isPartial = info.status === 'partial'
                    const isAvail   = info.status === 'available'
                    const dotColor  = isBooked ? '#E04A4A' : isPartial ? '#F5842A' : '#27A869'
                    const bgColor   = isBooked ? 'rgba(224,74,74,0.06)' : isPartial ? 'rgba(245,132,42,0.06)' : 'rgba(39,168,105,0.06)'
                    const bdColor   = isBooked ? 'rgba(224,74,74,0.25)' : isPartial ? 'rgba(245,132,42,0.25)' : 'rgba(39,168,105,0.25)'
                    const statusLabel = isBooked ? 'Fully Booked' : isPartial ? 'Partially Booked' : 'Available'

                    // Remaining time slots
                    const bookedH   = info.bookedHours
                    const remainH   = info.remainingHours
                    const totalH    = 8

                    // Build time slot visual — show booked block and free block
                    const bookedPct = Math.min(100, (bookedH / totalH) * 100)

                    // Calculate actual available time window
                    const bookedEndH   = s.startH + bookedH
                    const availStartH  = isPartial ? bookedEndH : s.startH
                    const availEndH    = s.startH + totalH

                    function fmtH(h: number) {
                      const hh = h % 24
                      return hh === 0 ? '12:00 AM' : hh < 12 ? `${hh}:00 AM` : hh === 12 ? '12:00 PM' : `${hh-12}:00 PM`
                    }

                    return (
                      <div key={s.key} style={{ padding:'14px',background:bgColor,borderRadius:12,border:`1px solid ${bdColor}` }}>
                        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                          <span style={{ fontSize:'1.2rem' }}>{s.icon}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700,fontSize:'0.88rem',color:'var(--ink)' }}>{s.label}</div>
                            <div style={{ fontSize:'0.7rem',color:'var(--muted)',marginTop:1 }}>{s.time}</div>
                          </div>
                          <span style={{ fontSize:'0.7rem',fontWeight:700,color:dotColor,background:'rgba(255,255,255,0.7)',padding:'3px 8px',borderRadius:20 }}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ marginBottom:8 }}>
                          <div style={{ height:6,borderRadius:3,background:'rgba(0,0,0,0.08)',overflow:'hidden' }}>
                            <div style={{ height:'100%',width:`${bookedPct}%`,background:dotColor,borderRadius:3,transition:'width 0.3s' }} />
                          </div>
                          <div style={{ display:'flex',justifyContent:'space-between',marginTop:4,fontSize:'0.65rem',color:'var(--muted)' }}>
                            <span>{bookedH}h booked</span>
                            <span>{remainH}h free</span>
                          </div>
                        </div>

                        {/* Available time slots */}
                        {!isBooked && (
                          <div style={{ fontSize:'0.72rem',color:dotColor,fontWeight:600,display:'flex',alignItems:'center',gap:5 }}>
                            <span style={{ width:6,height:6,borderRadius:'50%',background:dotColor,display:'inline-block' }} />
                            {isPartial
                              ? `Available: ${fmtH(availStartH)} – ${fmtH(availEndH)} (${remainH}h remaining)`
                              : `Full shift available: ${fmtH(s.startH)} – ${fmtH(availEndH)}`
                            }
                          </div>
                        )}
                        {isBooked && (
                          <div style={{ fontSize:'0.72rem',color:'#E04A4A',fontWeight:600,display:'flex',alignItems:'center',gap:5 }}>
                            <span style={{ width:6,height:6,borderRadius:'50%',background:'#E04A4A',display:'inline-block' }} />
                            This shift is fully booked
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Nurse Detail Modal ── */}
      {detailNurse && (
        <div onClick={()=>setDetailNurse(null)} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--card)',borderRadius:20,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#004A54,#006D7A)',padding:'24px 20px',borderRadius:'20px 20px 0 0',position:'relative' }}>
              <button onClick={()=>setDetailNurse(null)} style={{ position:'absolute',top:14,right:14,width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
              <div style={{ display:'flex',gap:14,alignItems:'center' }}>
                <div style={{ width:72,height:72,borderRadius:16,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',flexShrink:0,overflow:'hidden',border:'2px solid rgba(255,255,255,0.2)' }}>
                  {detailNurse.photoUrl
                    ? <img src={detailNurse.photoUrl} alt={detailNurse.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                    : nurseEmoji(detailNurse)
                  }
                </div>
                <div>
                  <div style={{ fontSize:'1.1rem',fontWeight:700,color:'#fff' }}>{detailNurse.name}</div>
                  <div style={{ fontSize:'0.78rem',color:'rgba(255,255,255,0.7)',marginTop:2 }}>{detailNurse.specialization}</div>
                  <div style={{ fontSize:'0.65rem',color:'rgba(255,255,255,0.5)',marginTop:2,fontFamily:'monospace' }}>ID: NC-{detailNurse.id.slice(-6).toUpperCase()}</div>
                  <div style={{ display:'inline-flex',alignItems:'center',gap:4,background:'rgba(18,135,90,0.25)',color:'#7FFFD4',borderRadius:100,padding:'2px 10px',fontSize:'0.62rem',fontWeight:700,marginTop:5 }}>
                    <span style={{ width:4,height:4,borderRadius:'50%',background:'#7FFFD4',display:'inline-block' }} /> Available
                  </div>
                </div>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding:'20px' }}>
              {/* Key info grid */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16 }}>
                {[
                  { icon:'📍', label:'City',         value: detailNurse.city || '—' },
                  { icon:'🌍', label:'Nationality',   value: detailNurse.nationality || '—' },
                  { icon: detailNurse.gender==='male'?'♂':'♀', label:'Gender', value: detailNurse.gender.charAt(0).toUpperCase()+detailNurse.gender.slice(1) },
                  { icon:'⏳', label:'Experience',    value: `${detailNurse.experienceYears} year${detailNurse.experienceYears!==1?'s':''}` },
                  { icon:'💰', label:'Rate/Hour',     value: detailNurse.hourlyRate ? `SAR ${patientRate(detailNurse.hourlyRate)}` : '—' },
                  { icon:'📅', label:'Daily Rate',    value: detailNurse.dailyRate ? `SAR ${patientRate(detailNurse.dailyRate)}` : '—' },
                  ...(detailNurse.languages?.length ? [{ icon:'🗣', label:'Languages', value: detailNurse.languages.join(', ') }] : []),
                ].map(item=>(
                  <div key={item.label} style={{ background:'var(--shell-bg)',borderRadius:10,padding:'10px 12px',border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'0.65rem',fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize:'0.85rem',fontWeight:700,color:'var(--ink)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Specialization */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:'0.68rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }}>Specialization</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                  {detailNurse.specialization.split('/').map(s=>(
                    <span key={s} style={{ padding:'4px 10px',borderRadius:6,fontSize:'0.75rem',fontWeight:600,background:'rgba(0,109,122,0.1)',color:'#006D7A' }}>{s.trim()}</span>
                  ))}
                  <span style={{ padding:'4px 10px',borderRadius:6,fontSize:'0.75rem',fontWeight:600,background:'rgba(18,135,90,0.1)',color:'#12875A' }}>MOH ✓</span>
                </div>
              </div>

              {/* Bio */}
              {detailNurse.bio && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:'0.68rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }}>About</div>
                  <p style={{ fontSize:'0.83rem',color:'var(--ink)',lineHeight:1.7,margin:0 }}>{detailNurse.bio}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex',gap:10,marginTop:4 }}>
                <button onClick={()=>setDetailNurse(null)} style={{ flex:1,padding:'11px',borderRadius:10,border:'1.5px solid var(--border)',background:'var(--card)',color:'var(--ink)',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',fontFamily:'inherit' }}>Close</button>
                <button onClick={()=>{ setDetailNurse(null); if(mode==='browse'){ setSelectedNurse(detailNurse); showToast(`${detailNurse.name} selected!`) } else if(mode==='smart'){ setMatchedNurse(detailNurse); showToast(`${detailNurse.name} selected!`) } }} style={{ flex:2,padding:'11px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#006D7A,#0ABFCC)',color:'#fff',fontWeight:700,fontSize:'0.85rem',cursor:'pointer',fontFamily:'inherit' }}>
                  Select This Provider →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
      `}</style>
    </div>
  )
}

// ── Bottom Next Button ────────────────────────────────────────────────────────
function BottomNextBtn({ mode, step, aiStep, color, onNext, isPending, selectedNurse, smartMatchLoading }: {
  mode: Mode; step: number; aiStep: number; color: string;
  onNext: () => void; isPending: boolean; selectedNurse: Nurse | null; smartMatchLoading?: boolean;
}) {
  const labels: Record<string, string> = {
    'smart-1': smartMatchLoading ? '🔍 Checking availability…' : 'Find Matching Nurses →',
    'smart-2': 'Confirm Booking →',
    'smart-3': isPending ? '⏳ Saving...' : '💾 Save Booking',
    'browse-1': selectedNurse ? `Book ${selectedNurse.name.split(' ')[0]} →` : 'Select a Provider First',
    'browse-2': 'Review Booking →',
    'browse-3': isPending ? '⏳ Saving...' : '💾 Save Booking',
    'ai-1': 'Proceed to Book →',
    'ai-2': 'Review & Confirm →',
    'ai-3': isPending ? '⏳ Saving...' : '💾 Save Booking',
  }
  const key = `${mode}-${mode === 'ai' ? aiStep : step}`
  const isDisabled = isPending || !!smartMatchLoading
  return (
    <button onClick={onNext} disabled={isDisabled} style={{
      padding:'11px 24px',borderRadius:10,border:'none',cursor:isDisabled?'not-allowed':'pointer',
      fontWeight:700,fontSize:'0.88rem',fontFamily:'inherit',
      background:`linear-gradient(135deg,${color},${color}cc)`,
      color:'#fff',opacity:isDisabled?0.7:1,
      boxShadow:`0 3px 14px ${color}44`,
      transition:'all 0.2s',
    }}>
      {labels[key] ?? 'Continue →'}
    </button>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function BookCard({ icon, title, sub, color, children }: { icon:string;title:string;sub:string;color:string;children:React.ReactNode }) {
  return (
    <div className="dash-card" style={{ marginBottom:'1rem',overflow:'hidden' }}>
      <div style={{ padding:'16px 20px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12 }}>
        <div style={{ width:40,height:40,borderRadius:11,background:color+'14',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0 }}>{icon}</div>
        <div>
          <div style={{ fontWeight:700,fontSize:'0.9rem',color:'var(--ink)' }}>{title}</div>
          <div style={{ fontSize:'0.72rem',color:'var(--muted)',marginTop:1 }}>{sub}</div>
        </div>
      </div>
      <div style={{ padding:'1.2rem' }}>{children}</div>
    </div>
  )
}

// ── Location Button ───────────────────────────────────────────────────────────
function LocationBtn({ onAddress }: { onAddress: (addr: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  async function handleClick() {
    setErr('')
    if (!navigator.geolocation) { setErr('Geolocation not supported'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
            { headers: { 'User-Agent': 'NurseCare+/1.0' } }
          )
          const data = await res.json()
          const a = data.address ?? {}
          // Build readable address: house_number road, suburb/neighbourhood, city
          const parts = [
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
            a.suburb ?? a.neighbourhood ?? a.quarter,
            a.city ?? a.town ?? a.village ?? a.county,
          ].filter(Boolean)
          const addr = parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || ''
          onAddress(addr)
        } catch {
          setErr('Could not fetch address')
        }
        setLoading(false)
      },
      (e) => {
        setErr(e.code === 1 ? 'Location permission denied' : 'Could not get location')
        setLoading(false)
      },
      { timeout: 10000 }
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title="Use my current location"
        style={{
          padding:'0 14px', height:42, borderRadius:9, border:'1.5px solid var(--border)',
          background: loading ? 'var(--cream)' : 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.08))',
          color: loading ? 'var(--muted)' : '#0E7B8C',
          fontSize:'0.82rem', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily:'inherit', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5,
          flexShrink:0,
        }}
      >
        {loading ? '⏳' : '📍'} {loading ? 'Locating…' : 'My Location'}
      </button>
      {err && <span style={{ fontSize:'0.65rem', color:'#E04A4A', fontWeight:600 }}>{err}</span>}
    </div>
  )
}

function Field({ label, children }: { label:string;children:React.ReactNode }) {
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
      <div style={{ fontSize:'0.68rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em' }}>{label}</div>
      {children}
    </div>
  )
}

function TimeSlotPicker({
  shift, startTime, endTime, onStartChange, onEndChange, minHours,
}: {
  shift: string
  startTime: string
  endTime: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  minHours: number
}) {
  const slots    = shiftSlots(shift)
  const computed = calcHours(startTime, endTime, shift)
  const isValid  = computed >= minHours

  return (
    <div style={{
      marginTop: 12, padding: '12px 14px',
      background: 'rgba(14,123,140,0.04)',
      border: '1px solid rgba(14,123,140,0.15)',
      borderRadius: 10,
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Select Time Slot
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: 3 }}>Start Time</div>
          <select
            value={startTime}
            onChange={e => onStartChange(e.target.value)}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem', fontFamily: 'inherit', background: '#fff', color: 'var(--ink)' }}
          >
            {slots.slice(0, -1).map(s => {
              const [val, label] = s.split('|')
              return <option key={val} value={val}>{label}</option>
            })}
          </select>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 16 }}>→</span>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: 3 }}>End Time</div>
          <select
            value={endTime}
            onChange={e => onEndChange(e.target.value)}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem', fontFamily: 'inherit', background: '#fff', color: 'var(--ink)' }}
          >
            {slots.slice(1).map(s => {
              const [val, label] = s.split('|')
              return <option key={val} value={val}>{label}</option>
            })}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: isValid ? '#27A869' : '#E04A4A',
        }}>
          {computed > 0 ? `${computed} hour${computed !== 1 ? 's' : ''} selected` : 'Select valid time range'}
        </span>
        {!isValid && computed > 0 && (
          <span style={{ fontSize: '0.68rem', color: '#E04A4A' }}>
            (Minimum {minHours}h required)
          </span>
        )}
      </div>
    </div>
  )
}

function ShiftCard({ shift, active, onClick, availStatus }: {
  shift:{icon:string;label:string;time:string};
  active:boolean;
  onClick:()=>void;
  availStatus?: 'available' | 'partial' | 'booked' | 'off' | null;
}) {
  const isBooked   = availStatus === 'booked'
  const isPartial  = availStatus === 'partial'
  const statusDot  = isBooked  ? { color:'#E04A4A', label:'Full' }
                   : isPartial ? { color:'#F5842A', label:'Partial' }
                   : availStatus === 'available' ? { color:'#27A869', label:'Available' }
                   : null
  return (
    <div
      onClick={isBooked ? undefined : onClick}
      style={{
        border:`1.5px solid ${active?'#006D7A':isBooked?'rgba(224,74,74,0.3)':'var(--border)'}`,
        borderRadius:12,padding:'12px 10px',textAlign:'center',
        cursor:isBooked?'not-allowed':'pointer',
        transition:'all 0.2s',
        background:active?'rgba(0,109,122,0.06)':isBooked?'rgba(224,74,74,0.04)':'var(--card)',
        opacity:isBooked?0.6:1,
        position:'relative',
      }}
    >
      <div style={{ fontSize:'1.2rem',marginBottom:4 }}>{shift.icon}</div>
      <div style={{ fontSize:'0.82rem',fontWeight:700,color:isBooked?'var(--muted)':'var(--ink)' }}>{shift.label}</div>
      <div style={{ fontSize:'0.65rem',color:'var(--muted)',fontFamily:'monospace',marginTop:2 }}>{shift.time}</div>
      {statusDot && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:3,marginTop:4 }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:statusDot.color,display:'inline-block' }} />
          <span style={{ fontSize:'0.6rem',color:statusDot.color,fontWeight:700 }}>{statusDot.label}</span>
        </div>
      )}
    </div>
  )
}

function NurseCard({ nurse, selected, onSelect, onViewDetails, onViewAvailability, color, showMatch, patientRate }: {
  nurse:Nurse; selected:boolean; onSelect:()=>void; onViewDetails:()=>void;
  onViewAvailability?:()=>void;
  color:string; showMatch?:boolean;
  patientRate: (r: number) => number;
}) {
  const shortId = nurse.id.slice(-6).toUpperCase()
  return (
    <div style={{ background:'var(--card)',borderRadius:16,border:`2px solid ${selected?color:'var(--border)'}`,overflow:'hidden',transition:'all 0.25s',boxShadow:selected?`0 0 0 3px ${color}22,0 8px 24px rgba(0,0,0,0.1)`:'0 2px 8px rgba(0,0,0,0.05)',transform:selected?'translateY(-2px)':'none' }}>
      {/* Banner */}
      <div style={{ background:`linear-gradient(135deg,${color}10,${color}06)`,padding:'14px 14px 0',display:'flex',gap:12,alignItems:'flex-end' }}>
        <div style={{ width:58,height:58,borderRadius:14,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',marginBottom:-18,border:'3px solid var(--card)',boxShadow:'0 3px 10px rgba(0,0,0,0.1)',flexShrink:0,overflow:'hidden' }}>
          {nurse.photoUrl
            ? <img src={nurse.photoUrl} alt={nurse.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            : nurseEmoji(nurse)
          }
        </div>
        <div style={{ paddingBottom:14 }}>
          <div style={{ display:'inline-flex',alignItems:'center',gap:4,background:'rgba(18,135,90,0.12)',color:'#12875A',borderRadius:100,padding:'2px 8px',fontSize:'0.6rem',fontWeight:700,marginBottom:3 }}>
            <span style={{ width:4,height:4,borderRadius:'50%',background:'#12875A',display:'inline-block' }} /> Available Today
          </div>
          <div style={{ fontSize:'0.88rem',fontWeight:700,color:'var(--ink)' }}>{nurse.name}</div>
          <div style={{ fontSize:'0.7rem',color:'var(--muted)' }}>{nurse.specialization} · {nurse.city}</div>
          <div style={{ fontSize:'0.6rem',color:'var(--muted)',marginTop:1,fontFamily:'monospace' }}>ID: NC-{shortId}</div>
        </div>
      </div>

      <div style={{ padding:'22px 14px 14px' }}>
        {/* Nationality + Gender pills */}
        <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:8 }}>
          {nurse.nationality && <span style={{ padding:'2px 7px',borderRadius:5,fontSize:'0.62rem',fontWeight:600,background:'var(--shell-bg)',color:'var(--muted)' }}>🌍 {nurse.nationality}</span>}
          <span style={{ padding:'2px 7px',borderRadius:5,fontSize:'0.62rem',fontWeight:600,background:'var(--shell-bg)',color:'var(--muted)' }}>{nurse.gender==='female'?'♀':'♂'} {nurse.gender}</span>
          {(nurse.languages ?? []).map(l => (
            <span key={l} style={{ padding:'2px 7px',borderRadius:5,fontSize:'0.62rem',fontWeight:600,background:'rgba(14,123,140,0.08)',color:'#0E7B8C' }}>🗣 {l}</span>
          ))}
        </div>
        {/* Tags */}
        <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginBottom:10 }}>
          <span style={{ padding:'2px 8px',borderRadius:5,fontSize:'0.62rem',fontWeight:600,background:color+'14',color }}>{nurse.specialization.split('/')[0].trim()}</span>
          <span style={{ padding:'2px 8px',borderRadius:5,fontSize:'0.62rem',fontWeight:600,background:'rgba(18,135,90,0.08)',color:'#12875A' }}>MOH ✓</span>
        </div>
        {/* Experience only — no fake ratings */}
        <div style={{ display:'flex',background:'var(--shell-bg)',borderRadius:9,overflow:'hidden',marginBottom:12 }}>
          <div style={{ flex:1,textAlign:'center',padding:'7px 4px',borderRight:'1px solid var(--border)' }}>
            <div style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--ink)' }}>{nurse.experienceYears} Yrs</div>
            <div style={{ fontSize:'0.6rem',color:'var(--muted)' }}>Experience</div>
          </div>
          <div style={{ flex:1,textAlign:'center',padding:'7px 4px' }}>
            <div style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--ink)' }}>SAR {patientRate(nurse.hourlyRate)}</div>
            <div style={{ fontSize:'0.6rem',color:'var(--muted)' }}>Per Hour</div>
          </div>
        </div>
        {/* Price + actions */}
        {/* Availability button */}
        {onViewAvailability && (
          <button onClick={onViewAvailability} style={{ width:'100%',marginBottom:8,padding:'6px',borderRadius:8,fontSize:'0.72rem',fontWeight:600,background:'rgba(14,123,140,0.06)',color:'var(--teal)',border:'1px solid rgba(14,123,140,0.2)',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
            📅 View Availability
          </button>
        )}
        <div style={{ display:'flex',gap:8,paddingTop:10,borderTop:'1px solid var(--border)' }}>
          <button onClick={onViewDetails} style={{ flex:1,padding:'7px',borderRadius:8,fontSize:'0.72rem',fontWeight:600,background:'var(--shell-bg)',color:'var(--muted)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'inherit' }}>
            View Details
          </button>
          <button onClick={onSelect} style={{ flex:2,padding:'7px 14px',borderRadius:8,fontSize:'0.75rem',fontWeight:700,background:selected?color:color+'14',color:selected?'#fff':color,border:'none',cursor:'pointer',transition:'all 0.2s',fontFamily:'inherit' }}>
            {selected?'✓ Selected':'Select'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SelectedBanner({ nurse, emoji, color, nationality, gender, onChangeFn }: { nurse:Nurse;emoji:string;color:string;nationality:string;gender:string;onChangeFn:()=>void }) {
  return (
    <div style={{ background:`linear-gradient(135deg,${color}10,${color}06)`,border:`1.5px solid ${color}30`,borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,marginBottom:16 }}>
      <div style={{ width:48,height:48,borderRadius:12,background:'var(--card)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',border:`2px solid ${color}20`,flexShrink:0 }}>{emoji}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.9rem',fontWeight:700,color }}>{nurse.name}</div>
        <div style={{ fontSize:'0.72rem',color:'var(--muted)' }}>{nurse.specialization} · {nurse.experienceYears} Yrs</div>
        {(nationality||gender) && <div style={{ fontSize:'0.68rem',color:'var(--muted)',marginTop:2 }}>{nationality&&`🌍 ${nationality}`}{nationality&&gender?' · ':''}{gender&&`${gender==='female'?'♀':'♂'} ${gender}`}</div>}
      </div>
      <button onClick={onChangeFn} style={{ padding:'7px 13px',borderRadius:8,background:'var(--card)',border:'1.5px solid var(--border)',fontSize:'0.75rem',fontWeight:600,color:'var(--muted)',cursor:'pointer',fontFamily:'inherit' }}>Change</button>
    </div>
  )
}

function ConfirmSummary({ rows }: { rows:[string,string|undefined][] }) {
  return (
    <div style={{ background:'linear-gradient(135deg,#004A54,#006D7A)',borderRadius:14,padding:'20px',marginBottom:16,color:'#fff' }}>
      <div style={{ fontSize:'0.68rem',fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14 }}>Booking Summary</div>
      {rows.filter(([,v])=>v&&v!=='—').map(([label,val])=>(
        <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.08)',fontSize:'0.85rem' }}>
          <span style={{ color:'rgba(255,255,255,0.6)' }}>{label}</span>
          <span style={{ fontWeight:600,color:'#fff',textAlign:'right',maxWidth:'60%' }}>{val}</span>
        </div>
      ))}
    </div>
  )
}

function PriceBreakdown({ rate, hours, vatRate }: { rate:number;hours:number;vatRate:number }) {
  const { base, vat, total } = calcPrice(rate, hours, vatRate)
  return (
    <div style={{ background:'rgba(0,109,122,0.05)',border:'1px solid rgba(0,109,122,0.12)',borderRadius:12,padding:'14px 16px',marginBottom:16 }}>
      {[
        [`Rate (SAR ${rate.toLocaleString()} × ${hours} hr${hours!==1?'s':''})`, `SAR ${base.toLocaleString()}`],
        [`Platform Fee`, `SAR ${PLATFORM_FEE.toLocaleString()}`],
        [`VAT (${vatRate.toFixed(0)}%)`, `SAR ${vat.toLocaleString()}`],
      ].map(([l,v])=>(
        <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(0,109,122,0.08)',fontSize:'0.82rem' }}>
          <span style={{ color:'var(--muted)' }}>{l}</span>
          <span style={{ fontWeight:600,color:'var(--ink)',fontFamily:'monospace' }}>{v}</span>
        </div>
      ))}
      <div style={{ display:'flex',justifyContent:'space-between',paddingTop:10,fontSize:'0.9rem' }}>
        <span style={{ fontWeight:700,color:'#006D7A' }}>Total</span>
        <span style={{ fontWeight:800,fontSize:'1.2rem',color:'#006D7A',fontFamily:'monospace' }}>SAR {total.toLocaleString()}</span>
      </div>
    </div>
  )
}
