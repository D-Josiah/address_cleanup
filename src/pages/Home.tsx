import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Styles object
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, #f9fafb 0%, #eef2f6 100%)'
    },
    card: {
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      padding: '3rem',
      width: '100%',
      maxWidth: '32rem',
      textAlign: 'center',
      transition: 'transform 0.3s, box-shadow 0.3s',
      ':hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 15px 30px rgba(0, 0, 0, 0.15)'
      }
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '2.5rem',
      color: '#333',
      position: 'relative',
      ':after': {
        content: '""',
        display: 'block',
        width: '60px',
        height: '4px',
        background: '#4a6bff',
        margin: '1.5rem auto 0',
        borderRadius: '2px'
      }
    },
    buttonGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '1.25rem',
      marginTop: '2rem'
    },
    button: {
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '1rem',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)'
      },
      ':active': {
        transform: 'translateY(0)'
      }
    },
    nameButton: {
      backgroundColor: '#4a6bff',
      ':hover': {
        backgroundColor: '#3a5bef'
      }
    },
    addressButton: {
      backgroundColor: '#34c759',
      ':hover': {
        backgroundColor: '#2bb54f'
      }
    },
    numberButton: {
      backgroundColor: '#9c59d1',
      ':hover': {
        backgroundColor: '#8c49c1'
      }
    },
    emailButton: {
      backgroundColor: '#f59e0b',
      ':hover': {
        backgroundColor: '#e58e00'
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Unmessy</h1>
        
        <div style={styles.buttonGrid}>
          <button
            onClick={() => handleNavigation('/name-table')}
            style={{ ...styles.button, ...styles.nameButton }}
          >
            Name Table
          </button>
          
          <button
            onClick={() => handleNavigation('/address-table')}
            style={{ ...styles.button, ...styles.addressButton }}
          >
            Address Table
          </button>
          
          <button
            onClick={() => handleNavigation('/number-table')}
            style={{ ...styles.button, ...styles.numberButton }}
          >
            Number Table
          </button>
          
          <button
            onClick={() => handleNavigation('/email-table')}
            style={{ ...styles.button, ...styles.emailButton }}
          >
            Email Table
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;