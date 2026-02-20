import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';


const ManagerDashboard = () => {
    const [reservationsByBranch, setReservationsByBranch] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(null); // Track selected branch visibility

    useEffect(() => {
        const fetchReservations = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reservations`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                console.log("Fetched Reservations:", data);

                // Group reservations by branch
                const groupedData = data.reduce((acc, reservation) => {
                    const branch = reservation.branch;
                    if (!acc[branch]) {
                        acc[branch] = [];
                    }
                    acc[branch].push(reservation);
                    return acc;
                }, {});
                setReservationsByBranch(groupedData);
            } catch (error) {
                setError('Error fetching reservations: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchReservations();
    }, []);

    // Function to handle reservation deletion
    const deleteReservation = async (id, branch) => {
        try {
            const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/reservations/delete/${id}`);
            if (response.status === 200) {
                toast.success("Reservation is deleted successfully");
                setReservationsByBranch((prevData) => {
                    const updatedData = { ...prevData };
                    // Remove the deleted reservation from the branch
                    updatedData[branch] = updatedData[branch].filter((reservation) => reservation._id !== id);

                    // If the branch has no reservations left, hide it (don't delete it)
                    if (updatedData[branch].length === 0) {
                        updatedData[branch] = null;  // Set it to null to hide it
                    }

                    return updatedData;
                });
            }
        } catch (error) {
            toast.error("Error deleting reservation");
        }
    };

    // Toggle visibility of branch data
    const toggleBranchVisibility = (branch) => {
        setSelectedBranch((prevBranch) => (prevBranch === branch ? null : branch)); // Toggle visibility of branch
    };

    return (
        <div style={{ padding: '20px' }}>
            <div className="manager-header">
                <a href="/" className="back-to-home-btn">Back to Home</a>
                <h1>Manager Dashboard</h1>
            </div>
            {loading && <p>Loading reservations...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className='reservation-container'>
                {Object.keys(reservationsByBranch).length > 0 ? (
                    Object.entries(reservationsByBranch).map(([branch, reservations]) => (
                        reservations !== null && (
                            <div key={branch} className="branch-column">
                                <button
                                    onClick={() => toggleBranchVisibility(branch)}
                                    className='btn'
                                >
                                    {branch} Branch
                                </button>
                                {selectedBranch === branch && (
                                    <div className="reservation-items-container">
                                        {reservations.map(reservation => (
                                            <div className="reservation-item" key={reservation._id}>
                                                <div>NAME: {reservation.firstName} {reservation.lastName}</div>
                                                <div>EMAIL: {reservation.email}</div>
                                                <div>DATE: {reservation.date}</div>
                                                <div>TIME: {reservation.time}</div>
                                                <div>PHONE: {reservation.phone}</div>
                                                <div>BRANCH: {reservation.branch}</div>
                                                <div className="delete-btn-container">
                                                    <button onClick={() => deleteReservation(reservation._id, branch)}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    ))
                ) : (
                    <p>No reservations found.</p>
                )}
            </div>
        </div>
    );
};

export default ManagerDashboard;
