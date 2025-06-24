import { useEffect, useState } from 'react';

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const day = time.getDate();
  const weekDay = time.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();

  return (
    <div className="flex items-center justify-center bg-black/50 rounded-lg p-3 text-white">
      <div className="text-center">
        <div className="flex items-baseline gap-1">
          <span style={{ fontFamily: 'BebasNeue' }} className="text-3xl tracking-wider">{hours}</span>
          <span style={{ fontFamily: 'BebasNeue' }} className="text-3xl tracking-wider">:</span>
          <span style={{ fontFamily: 'BebasNeue' }} className="text-3xl tracking-wider">{minutes}</span>
        </div>
        <div className="text-xs opacity-80 mt-0.5 font-light">
          <span className="mr-1">{day}</span>
          <span>{weekDay}</span>
        </div>
      </div>
    </div>
  );
} 