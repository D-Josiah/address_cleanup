import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AddressTable from './pages/AddressTable';
import NameTable from './pages/NameTable';
import Home from './pages/Home';
import EmailTable from './pages/EmailTable';
import NumberTable from './pages/NumberTable';

const App = () => {
  return (
    <Router>
      
      
      <Routes>
      <Route path="/" element={<Home />} />
        <Route path="/name-table" element={<NameTable />} />
        <Route path="/address-table" element={<AddressTable />} />
        <Route path="/number-table" element={<NumberTable />} />
        <Route path="/email-table" element={<EmailTable />} />
       
    
      </Routes> 

    </Router>
  );
};

export default App;
