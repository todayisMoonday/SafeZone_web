import { Outlet } from 'react-router-dom';
import './App.css';

const Layout = () => {
  return (
    <div className="app-frame">
      <div className="app-viewport">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
