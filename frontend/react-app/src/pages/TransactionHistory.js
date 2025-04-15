import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatTokenAmount } from '../utils/contracts';
import { ethers } from 'ethers';
import '../user-dashboard.css';
import '../transaction-history.css';

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [networkName, setNetworkName] = useState('');

  // Initialization
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize contracts
        const contractsResult = await initializeContracts();
        const { address } = contractsResult;
        setAddress(address);

        // Get network name
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const network = await provider.getNetwork();
          setNetworkName(network.name);
        } catch (error) {
          console.error('Failed to get network name:', error);
          setNetworkName('sepolia'); // Default to sepolia testnet
        }

        // Load transaction history
        await fetchTransactions(address, 1);
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to connect wallet or load contracts, please refresh the page and try again');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Fetch transaction history
  const fetchTransactions = async (userAddress, pageNum) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/transactions?userAddress=${userAddress}&page=${pageNum}&limit=10`);
      const data = await response.json();

      setTransactions(data.transactions);
      setPage(data.page);
      setTotalPages(data.pages);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      setError('Failed to fetch transaction history, please try again');
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchTransactions(address, newPage);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get transaction link
  const getTransactionLink = (txHash) => {
    if (!txHash) return '#';

    // If network name is empty, default to sepolia
    const network = networkName || 'sepolia';
    return `https://${network === 'homestead' ? '' : network + '.'}etherscan.io/tx/${txHash}`;
  };

  return (
    <div>
      <Header address={address} isAdmin={false} />
      <div className="user-dashboard-container">
        <div className="user-dashboard-header">
          <h1 className="user-dashboard-title">Transaction History</h1>
          <button
            className="user-dashboard-refresh-btn"
            onClick={() => fetchTransactions(address, page)}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="user-dashboard-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="user-dashboard-loading">
            <div className="user-dashboard-spinner"></div>
            <p className="user-dashboard-loading-text">Loading...</p>
          </div>
        ) : (
          <div className="transaction-history-container">
            {transactions.length === 0 ? (
              <div className="transaction-history-empty">
                <p>No transaction records</p>
              </div>
            ) : (
              <>
                <div className="transaction-history-table">
                  <div className="transaction-history-header">
                    <div className="transaction-history-cell">Time</div>
                    <div className="transaction-history-cell">Type</div>
                    <div className="transaction-history-cell">Input</div>
                    <div className="transaction-history-cell">Output</div>
                    <div className="transaction-history-cell">Status</div>
                    <div className="transaction-history-cell">Action</div>
                  </div>
                  {transactions.map((tx) => (
                    <div key={tx.id} className="transaction-history-row">
                      <div className="transaction-history-cell">{formatDate(tx.createdAt)}</div>
                      <div className="transaction-history-cell">
                        {tx.tokenIn} → {tx.tokenOut}
                      </div>
                      <div className="transaction-history-cell">
                        {tx.amountIn} {tx.tokenIn}
                      </div>
                      <div className="transaction-history-cell">
                        {tx.amountOut} {tx.tokenOut}
                      </div>
                      <div className="transaction-history-cell">
                        <span className={`transaction-status ${tx.status === 'success' ? 'success' : 'failed'}`}>
                          {tx.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <div className="transaction-history-cell">
                        <a
                          href={getTransactionLink(tx.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transaction-link-btn"
                        >
                          View Transaction
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="transaction-history-pagination">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || loading}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
