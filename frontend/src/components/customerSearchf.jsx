import React, { useState } from 'react';

const CustomerSearch = () => {
  const [query, setQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState(mockCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    const filtered = mockCustomers.filter((customer) =>
      customer.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const handleSelect = (customer) => {
    setSelectedCustomer(customer);
    setQuery(customer.name);
    setFilteredCustomers([]);
  };

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={handleSearchChange}
        placeholder="Search customer..."
        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-400"
      />

      {filteredCustomers.length > 0 && query === selectedCustomer?.name && (
        <ul className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-md shadow max-h-48 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <li
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="px-4 py-2 cursor-pointer hover:bg-blue-100"
            >
              {customer.name}
            </li>
          ))}
        </ul>
      )}

      {selectedCustomer && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold text-gray-700">Selected Customer:</h3>
          <p className="text-sm text-gray-600">ID: {selectedCustomer.id}</p>
          <p className="text-sm text-gray-600">Name: {selectedCustomer.name}</p>
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
