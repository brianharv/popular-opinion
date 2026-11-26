import { BrowserRouter, Link, Route, Routes } from 'react-router';
import './style.css';
import { Home } from './pages/home';
import { HowToPlay } from './pages/how-to-play';
import { Room } from './pages/room';

export function App() {
  return (
    <BrowserRouter>
      <main>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/how-to-play' element={<HowToPlay />} />
          <Route path='/room/:code' element={<Room />} />
          <Route path='*' element={<Link to='/'>Back to home</Link>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
