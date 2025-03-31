import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AddressTable from './pages/AddressTable';


const App = () => {
  return (
    <Router>
      
      
      <Routes>
        <Route path="/" element={<AddressTable />} />
       
    
      </Routes> 

    </Router>
  );
};

export default App;
