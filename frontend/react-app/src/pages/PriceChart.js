import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts } from '../utils/contracts';
import { ethers } from 'ethers';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import '../user-dashboard.css';
import '../price-chart.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const PriceChart = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rateChanges, setRateChanges] = useState([]);
  const [timeRange, setTimeRange] = useState('24h'); // Default show 24 hours
  const [chartData, setChartData] = useState(null);
  const [direction, setDirection] = useState('btkToMtk'); // Default show BTK to MTK rate

  // Initialization
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize contracts
        const contractsResult = await initializeContracts();
        const { address } = contractsResult;
        setAddress(address);

        // Load exchange rate change data
        await fetchRateChanges();
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to connect wallet or load contracts, please refresh the page and try again');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // When time range or direction changes, update chart data
  useEffect(() => {
    if (rateChanges.length > 0) {
      prepareChartData();
    }
  }, [rateChanges, timeRange, direction]);

  // Get exchange rate change data
  const fetchRateChanges = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/rate-changes?limit=100');
      const data = await response.json();

      // Sort by time (from early to late)
      const sortedData = data.rateChanges.sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );

      setRateChanges(sortedData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to get exchange rate change data:', error);
      setError('Failed to get exchange rate change data, please try again');
      setLoading(false);
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    // Filter data by time range
    const now = new Date();
    let filteredData = [...rateChanges];

    if (timeRange === '24h') {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filteredData = rateChanges.filter(item => new Date(item.createdAt) >= oneDayAgo);
    } else if (timeRange === '7d') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredData = rateChanges.filter(item => new Date(item.createdAt) >= sevenDaysAgo);
    } else if (timeRange === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredData = rateChanges.filter(item => new Date(item.createdAt) >= thirtyDaysAgo);
    }

    // If there is no data, add current rate as a point
    if (filteredData.length === 0 && rateChanges.length > 0) {
      filteredData = [rateChanges[rateChanges.length - 1]];
    }

    // Prepare chart data
    const labels = filteredData.map(item => new Date(item.createdAt));
    const rates = filteredData.map(item =>
      direction === 'btkToMtk'
        ? parseFloat(item.rateBefore.btkToMtk)
        : parseFloat(item.rateBefore.mtkToBtk)
    );

    // If there is data, add the latest rate point
    if (filteredData.length > 0) {
      const lastItem = filteredData[filteredData.length - 1];
      labels.push(new Date(lastItem.createdAt));
      rates.push(
        direction === 'btkToMtk'
          ? parseFloat(lastItem.rateAfter.btkToMtk)
          : parseFloat(lastItem.rateAfter.mtkToBtk)
      );
    }

    // Set chart data
    setChartData({
      labels,
      datasets: [
        {
          label: direction === 'btkToMtk' ? 'BTK → MTK Rate' : 'MTK → BTK Rate',
          data: rates,
          borderColor: direction === 'btkToMtk' ? 'rgb(53, 162, 235)' : 'rgb(255, 99, 132)',
          backgroundColor: direction === 'btkToMtk' ? 'rgba(53, 162, 235, 0.5)' : 'rgba(255, 99, 132, 0.5)',
          tension: 0.1,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    });
  };

  // Switch time range
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  // Switch direction
  const handleDirectionChange = (dir) => {
    setDirection(dir);
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: direction === 'btkToMtk' ? 'BTK to MTK Rate Changes' : 'MTK to BTK Rate Changes',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Rate: ${context.parsed.y.toFixed(6)}`;
          },
          title: function(context) {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString('en-US');
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeRange === '24h' ? 'hour' : timeRange === '7d' ? 'day' : 'week',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MM-dd',
            week: 'yyyy-MM-dd'
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Rate'
        },
        ticks: {
          callback: function(value) {
            return value.toFixed(6);
          }
        }
      }
    }
  };

  // Get rate change percentage
  const getRateChangePercentage = () => {
    if (rateChanges.length < 2) return '0.00%';

    const latestChange = rateChanges[rateChanges.length - 1];
    const changePercentage = direction === 'btkToMtk'
      ? latestChange.changePercentage.btkToMtk
      : latestChange.changePercentage.mtkToBtk;

    const value = parseFloat(changePercentage);
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Get current rate
  const getCurrentRate = () => {
    if (rateChanges.length === 0) return '0.000000';

    const latestChange = rateChanges[rateChanges.length - 1];
    const rate = direction === 'btkToMtk'
      ? latestChange.rateAfter.btkToMtk
      : latestChange.rateAfter.mtkToBtk;

    return parseFloat(rate).toFixed(6);
  };

  // Get rate change type (up/down)
  const getRateChangeType = () => {
    if (rateChanges.length === 0) return 'neutral';

    const latestChange = rateChanges[rateChanges.length - 1];
    const changePercentage = direction === 'btkToMtk'
      ? latestChange.changePercentage.btkToMtk
      : latestChange.changePercentage.mtkToBtk;

    return parseFloat(changePercentage) >= 0 ? 'up' : 'down';
  };

  return (
    <div>
      <Header address={address} isAdmin={false} />
      <div className="user-dashboard-container">
        <div className="user-dashboard-header">
          <h1 className="user-dashboard-title">Price Chart</h1>
          <button
            className="user-dashboard-refresh-btn"
            onClick={fetchRateChanges}
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
          <div className="price-chart-container">
            {/* Rate information card */}
            <div className="price-info-card">
              <div className="price-info-header">
                <h3>Current Rate</h3>
                <div className="price-direction-toggle">
                  <button
                    className={`direction-btn ${direction === 'btkToMtk' ? 'active' : ''}`}
                    onClick={() => handleDirectionChange('btkToMtk')}
                  >
                    BTK → MTK
                  </button>
                  <button
                    className={`direction-btn ${direction === 'mtkToBtk' ? 'active' : ''}`}
                    onClick={() => handleDirectionChange('mtkToBtk')}
                  >
                    MTK → BTK
                  </button>
                </div>
              </div>
              <div className="price-info-body">
                <div className="current-rate">
                  {getCurrentRate()}
                </div>
                <div className={`rate-change ${getRateChangeType()}`}>
                  {getRateChangePercentage()}
                </div>
                <div className="rate-label">
                  {direction === 'btkToMtk' ? '1 BTK = ' + getCurrentRate() + ' MTK' : '1 MTK = ' + getCurrentRate() + ' BTK'}
                </div>
              </div>
            </div>

            {/* Time range selection */}
            <div className="time-range-selector">
              <button
                className={`time-range-btn ${timeRange === '24h' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('24h')}
              >
                24 Hours
              </button>
              <button
                className={`time-range-btn ${timeRange === '7d' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('7d')}
              >
                7 Days
              </button>
              <button
                className={`time-range-btn ${timeRange === '30d' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('30d')}
              >
                30 Days
              </button>
              <button
                className={`time-range-btn ${timeRange === 'all' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('all')}
              >
                All
              </button>
            </div>

            {/* Chart */}
            <div className="chart-container">
              {chartData ? (
                <Line data={chartData} options={chartOptions} height={400} />
              ) : (
                <div className="no-data-message">
                  <p>No rate data available</p>
                </div>
              )}
            </div>

            {/* Pool balance information */}
            {rateChanges.length > 0 && (
              <div className="pool-balance-info">
                <h3>Pool Balance Information</h3>
                <div className="pool-balance-grid">
                  <div className="pool-balance-item">
                    <div className="pool-balance-label">BTK Balance</div>
                    <div className="pool-balance-value">
                      {parseFloat(rateChanges[rateChanges.length - 1].poolBalanceAfter.btk).toFixed(4)} BTK
                    </div>
                  </div>
                  <div className="pool-balance-item">
                    <div className="pool-balance-label">MTK Balance</div>
                    <div className="pool-balance-value">
                      {parseFloat(rateChanges[rateChanges.length - 1].poolBalanceAfter.mtk).toFixed(4)} MTK
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceChart;
