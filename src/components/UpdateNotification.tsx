import { useEffect, useState } from 'react';

interface UpdateNotificationProps {
  message: string;
}

const UpdateNotification = ({ message }: UpdateNotificationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-up">
      {message}
    </div>
  );
};

export default UpdateNotification; 