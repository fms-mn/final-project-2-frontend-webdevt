import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './BackToHome.css';
import { clearPendingBooking } from '../utils/pendingBooking';

export default function BackToHome() {
  return <Link to="/" className="back-to-home" onClick={() => clearPendingBooking()}><FiArrowLeft aria-hidden="true" /><span>Back to home</span></Link>;
}
