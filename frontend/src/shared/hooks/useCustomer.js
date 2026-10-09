import { useContext } from 'react';
import { CustomerContext } from '../context/CustomerContext';

export const useCustomer = () => {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within a CustomerProvider');
  return ctx;
};
export default useCustomer;
