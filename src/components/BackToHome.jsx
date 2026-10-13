import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './BackToHome.css';

export default function BackToHome() {
  return <Link to="/" className="back-to-home"><FiArrowLeft aria-hidden="true" /><span>Back to home</span></Link>;
}
