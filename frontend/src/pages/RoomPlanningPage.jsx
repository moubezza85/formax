import React, { useState, useEffect } from 'react';
import { sessionsService } from '../services/api';
import { Calendar, ChevronLeft, ChevronRight, MapPin, User, Clock, Info } from 'lucide-react';

export default function RoomPlanningPage() {
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsData, roomsData] = await Promise.all([
        sessionsService.getAllSessions(),
        sessionsService.listRooms()
      ]);
      setSessions(sessionsData);
      setRooms(roomsData.length > 0 ? roomsData : ['Salle 1', 'Salle 2', 'Salle 3']); // Fallback if no rooms yet
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const prevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const getDaySessions = () => {
    return sessions.filter(s => {
      const sDate = new Date(s.date);
      return sDate.toDateString() === currentDate.toDateString();
    });
  };

  const daySessions = getDaySessions();
  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 8); // 8h to 21h

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Planning des Salles</h1>
          <p className="text-muted">Visualisez l'occupation des salles en temps réel.</p>
        </div>
        <div className="flex items-center gap-1 bg-white p-0-5 rounded-lg shadow-sm border border-surface-border">
          <button className="btn-icon" onClick={prevDay}><ChevronLeft size={20} /></button>
          <div className="px-2 font-bold flex items-center gap-0-5">
            <Calendar size={18} className="text-primary" />
            {currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <button className="btn-icon" onClick={nextDay}><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="p-3 text-center text-muted">Chargement du planning...</div>
        ) : (
          <div style={{ minWidth: '800px' }}>
            <div className="flex border-b border-surface-border bg-glass">
              <div className="w-10 border-r border-surface-border"></div>
              {rooms.map(room => (
                <div key={room} className="flex-1 p-1 text-center font-bold border-r border-surface-border last:border-r-0">
                  <div className="flex items-center justify-center gap-0-5">
                    <MapPin size={16} className="text-primary" />
                    {room}
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              {timeSlots.map(hour => (
                <div key={hour} className="flex border-b border-surface-border" style={{ height: '80px' }}>
                  <div className="w-10 p-0-5 text-right text-xs font-bold text-muted border-r border-surface-border bg-glass">
                    {hour}h00
                  </div>
                  {rooms.map(room => {
                    // Find session in this room at this hour
                    const sessionInRoom = daySessions.find(s => {
                       const sHour = new Date(s.date).getHours();
                       return s.room === room && sHour === hour;
                    });

                    return (
                      <div key={room} className="flex-1 border-r border-surface-border last:border-r-0 relative group hover:bg-glass transition-all">
                        {sessionInRoom && (
                          <div 
                            className={`absolute inset-0-5 rounded-lg p-1 overflow-hidden border-l-4 shadow-sm transition-all hover:scale-102 z-1 ${
                                sessionInRoom.status === 'completed' ? 'bg-secondary-light border-secondary text-secondary-dark' : 'bg-primary-light border-primary text-primary-dark'
                            }`}
                            style={{ height: `${sessionInRoom.duration_hours * 80 - 8}px` }}
                          >
                            <p className="text-xs font-bold leading-tight line-clamp-2">{sessionInRoom.training_title}</p>
                            <div className="flex items-center gap-0-2 text-[10px] mt-0-5 opacity-80">
                              <User size={10} />
                              {sessionInRoom.trainer_name}
                            </div>
                            <div className="flex items-center gap-0-2 text-[10px] opacity-80">
                                <Clock size={10} />
                                {sessionInRoom.duration_hours}h
                            </div>
                            {sessionInRoom.status === 'completed' && (
                                <div className="absolute top-0-5 right-0-5">
                                    <div className="w-1-5 h-1-5 rounded-full bg-secondary flex items-center justify-center text-white">
                                        <Info size={10} />
                                    </div>
                                </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-3 gap-1-5">
         <div className="card flex items-center gap-1 border-l-4 border-primary bg-glass">
            <div className="p-1 rounded bg-white text-primary"><Clock size={24} /></div>
            <div>
               <p className="text-xs font-bold text-muted uppercase">Sessions ce Jour</p>
               <h3 className="text-xl font-bold">{daySessions.length}</h3>
            </div>
         </div>
         <div className="card flex items-center gap-1 border-l-4 border-secondary bg-glass">
            <div className="p-1 rounded bg-white text-secondary"><MapPin size={24} /></div>
            <div>
               <p className="text-xs font-bold text-muted uppercase">Salles Actives</p>
               <h3 className="text-xl font-bold">{[...new Set(daySessions.map(s => s.room))].length}</h3>
            </div>
         </div>
         <div className="card flex items-center gap-1 border-l-4 border-success bg-glass">
            <div className="p-1 rounded bg-white text-success"><Calendar size={24} /></div>
            <div>
               <p className="text-xs font-bold text-muted uppercase">Taux d'Occupation</p>
               <h3 className="text-xl font-bold">
                 {Math.round((daySessions.reduce((sum, s) => sum + s.duration_hours, 0) / (rooms.length * 12)) * 100)}%
               </h3>
            </div>
         </div>
      </div>
    </div>
  );
}
