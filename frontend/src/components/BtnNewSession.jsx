import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

const BtnNewSession = ({ label = 'New Session' }) => {
  const navigate = useNavigate();

  return (
    <button 
      className="btn-new-session" 
      onClick={() => navigate('/sessions/new')}
    >
      <Plus size={18} />
      <span>{label}</span>
    </button>
  );
};

export default BtnNewSession;
