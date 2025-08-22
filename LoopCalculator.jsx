import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, AlertTriangle, CheckCircle, Download, Info, Zap, Settings, TrendingUp } from 'lucide-react';

// Wire resistance data (Ω/km at 20°C)
const WIRE_RESISTANCE_AWG = {
  '14': 8.282,
  '16': 13.17,
  '18': 20.95,
  '20': 33.31,
  '22': 52.96,
  '24': 84.22
};

const WIRE_RESISTANCE_METRIC = {
  '0.5': 36.0,
  '0.75': 24.0,
  '1.0': 18.0,
  '1.5': 12.0,
  '2.5': 7.2,
  '4.0': 4.5
};

// Standard resistor values (E24 series)
const STANDARD_RESISTORS = [
  100, 110, 120, 130, 150, 160, 180, 200, 220, 240, 270, 300,
  330, 360, 390, 430, 470, 510, 560, 620, 680, 750, 820, 910,
  1000, 1100, 1200, 1300, 1500, 1600, 1800, 2000, 2200, 2400,
  2700, 3000, 3300, 3600, 3900, 4300, 4700, 5100, 5600, 6200,
  6800, 7500, 8200, 9100, 10000
];

// Validation functions
const validateInput = (value, min, max, fieldName) => {
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
};

const LoopCalculator = () => {
  // Input states
  const [supplyVoltage, setSupplyVoltage] = useState(24);
  const [wireType, setWireType] = useState('AWG');
  const [wireSize, setWireSize] = useState('18');
  const [wireLength, setWireLength] = useState(100);
  const [numTransmitters, setNumTransmitters] = useState(1);
  const [transmitterResistance, setTransmitterResistance] = useState(250);
  const [numReceivers, setNumReceivers] = useState(1);
  const [receiverResistance, setReceiverResistance] = useState(250);
  const [outputVoltageMin, setOutputVoltageMin] = useState(1);
  const [outputVoltageMax, setOutputVoltageMax] = useState(5);
  const [customBurdenResistor, setCustomBurdenResistor] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Error states
  const [errors, setErrors] = useState({});
  
  // Calculated results
  const [results, setResults] = useState({
    wireResistance: 0,
    totalLoopResistance: 0,
    voltageDrop4mA: 0,
    voltageDrop20mA: 0,
    recommendedBurdenResistor: 0,
    nearestStandardResistor: 0,
    powerSupplyAdequate4mA: false,
    powerSupplyAdequate20mA: false,
    headroomVoltage4mA: 0,
    headroomVoltage20mA: 0,
    loopEfficiency: 0,
    maxWireLength: 0
  });

  // Calculate wire resistance
  const calculateWireResistance = useMemo(() => {
    const resistanceTable = wireType === 'AWG' ? WIRE_RESISTANCE_AWG : WIRE_RESISTANCE_METRIC;
    const resistancePerUnit = resistanceTable[wireSize] || 0;
    const length = wireType === 'AWG' ? wireLength * 0.3048 / 1000 : wireLength / 1000; // Convert to km
    return resistancePerUnit * length * 2; // Round trip
  }, [wireType, wireSize, wireLength]);

  // Find nearest standard resistor value
  const findNearestStandardResistor = (targetValue) => {
    return STANDARD_RESISTORS.reduce((prev, curr) => 
      Math.abs(curr - targetValue) < Math.abs(prev - targetValue) ? curr : prev
    );
  };

  // Calculate burden resistor for desired voltage output
  const calculateBurdenResistor = useMemo(() => {
    if (outputVoltageMax <= outputVoltageMin) return 0;
    const voltageRange = outputVoltageMax - outputVoltageMin;
    const currentRange = 0.016; // 20mA - 4mA = 16mA
    return (voltageRange / currentRange) * 1000; // Convert to ohms
  }, [outputVoltageMin, outputVoltageMax]);

  // Validate inputs
  useEffect(() => {
    const newErrors = {};
    
    // Validate supply voltage
    const supplyError = validateInput(supplyVoltage, 12, 48, 'Supply voltage');
    if (supplyError) newErrors.supplyVoltage = supplyError;
    
    // Validate wire length
    const lengthError = validateInput(wireLength, 1, 10000, 'Wire length');
    if (lengthError) newErrors.wireLength = lengthError;
    
    // Validate component counts
    if (numTransmitters < 0 || numTransmitters > 10) {
      newErrors.numTransmitters = 'Number of transmitters must be between 0 and 10';
    }
    if (numReceivers < 0 || numReceivers > 10) {
      newErrors.numReceivers = 'Number of receivers must be between 0 and 10';
    }
    
    // Validate resistances
    if (transmitterResistance < 0 || transmitterResistance > 10000) {
      newErrors.transmitterResistance = 'Transmitter resistance must be between 0 and 10kΩ';
    }
    if (receiverResistance < 0 || receiverResistance > 10000) {
      newErrors.receiverResistance = 'Receiver resistance must be between 0 and 10kΩ';
    }
    
    // Validate output voltage range
    if (outputVoltageMin >= outputVoltageMax) {
      newErrors.outputVoltageRange = 'Maximum voltage must be greater than minimum voltage';
    }
    if (outputVoltageMin < 0 || outputVoltageMax > 50) {
      newErrors.outputVoltageRange = 'Output voltage must be between 0 and 50V';
    }
    
    // Validate custom burden resistor
    if (customBurdenResistor && (parseFloat(customBurdenResistor) < 0 || parseFloat(customBurdenResistor) > 100000)) {
      newErrors.customBurdenResistor = 'Custom burden resistor must be between 0 and 100kΩ';
    }
    
    setErrors(newErrors);
  }, [supplyVoltage, wireLength, numTransmitters, numReceivers, transmitterResistance, 
       receiverResistance, outputVoltageMin, outputVoltageMax, customBurdenResistor]);

  // Main calculation function
  useEffect(() => {
    if (Object.keys(errors).length > 0) return;
    
    const wireRes = calculateWireResistance;
    const totalTransmitterRes = numTransmitters * transmitterResistance;
    const totalReceiverRes = numReceivers * receiverResistance;
    const recommendedBurden = calculateBurdenResistor;
    const burdenRes = customBurdenResistor ? parseFloat(customBurdenResistor) : recommendedBurden;
    const nearestStandard = findNearestStandardResistor(recommendedBurden);
    
    const totalLoopRes = wireRes + totalTransmitterRes + totalReceiverRes + burdenRes;
    
    const vDrop4mA = 0.004 * totalLoopRes; // 4mA
    const vDrop20mA = 0.020 * totalLoopRes; // 20mA
    
    const minHeadroom = 12; // Typical headroom needed
    const adequate4mA = supplyVoltage >= (vDrop4mA + minHeadroom);
    const adequate20mA = supplyVoltage >= (vDrop20mA + minHeadroom);
    
    const headroom4mA = supplyVoltage - vDrop4mA;
    const headroom20mA = supplyVoltage - vDrop20mA;
    
    // Calculate loop efficiency (voltage utilization)
    const loopEfficiency = ((vDrop4mA + vDrop20mA) / 2) / supplyVoltage * 100;
    
    // Calculate maximum wire length for current configuration
    const maxWireLength = adequate20mA ? 
      ((supplyVoltage - minHeadroom) / 0.020 - totalTransmitterRes - totalReceiverRes - burdenRes) / 
      (wireType === 'AWG' ? WIRE_RESISTANCE_AWG[wireSize] * 0.3048 / 1000 * 2 : WIRE_RESISTANCE_METRIC[wireSize] / 1000 * 2) :
      0;
    
    setResults({
      wireResistance: wireRes,
      totalLoopResistance: totalLoopRes,
      voltageDrop4mA: vDrop4mA,
      voltageDrop20mA: vDrop20mA,
      recommendedBurdenResistor: recommendedBurden,
      nearestStandardResistor: nearestStandard,
      powerSupplyAdequate4mA: adequate4mA,
      powerSupplyAdequate20mA: adequate20mA,
      headroomVoltage4mA: headroom4mA,
      headroomVoltage20mA: headroom20mA,
      loopEfficiency: loopEfficiency,
      maxWireLength: maxWireLength
    });
  }, [supplyVoltage, wireType, wireSize, wireLength, numTransmitters, transmitterResistance, 
      numReceivers, receiverResistance, outputVoltageMin, outputVoltageMax, customBurdenResistor, 
      calculateWireResistance, calculateBurdenResistor, errors]);

  const exportResults = () => {
    const data = `4-20mA Loop Calculator Results
Generated: ${new Date().toLocaleString()}

INPUT PARAMETERS:
Supply Voltage: ${supplyVoltage} V
Wire Type: ${wireType} ${wireSize}
Wire Length: ${wireLength} ${wireType === 'AWG' ? 'feet' : 'meters'}
Transmitters: ${numTransmitters} × ${transmitterResistance}Ω
Receivers: ${numReceivers} × ${receiverResistance}Ω
Output Range: ${outputVoltageMin}-${outputVoltageMax} V
${customBurdenResistor ? `Custom Burden Resistor: ${customBurdenResistor} Ω` : ''}

CALCULATED RESULTS:
Wire Resistance: ${results.wireResistance.toFixed(2)} Ω
Total Loop Resistance: ${results.totalLoopResistance.toFixed(2)} Ω
Voltage Drop @ 4mA: ${results.voltageDrop4mA.toFixed(2)} V
Voltage Drop @ 20mA: ${results.voltageDrop20mA.toFixed(2)} V
Recommended Burden Resistor: ${results.recommendedBurdenResistor.toFixed(1)} Ω
Nearest Standard Resistor: ${results.nearestStandardResistor} Ω
Power Supply Adequate @ 4mA: ${results.powerSupplyAdequate4mA ? 'YES' : 'NO'}
Power Supply Adequate @ 20mA: ${results.powerSupplyAdequate20mA ? 'YES' : 'NO'}
Headroom @ 4mA: ${results.headroomVoltage4mA.toFixed(2)} V
Headroom @ 20mA: ${results.headroomVoltage20mA.toFixed(2)} V
Loop Efficiency: ${results.loopEfficiency.toFixed(1)}%
${results.maxWireLength > 0 ? `Maximum Wire Length: ${results.maxWireLength.toFixed(0)} ${wireType === 'AWG' ? 'feet' : 'meters'}` : ''}

${Object.keys(errors).length > 0 ? '\nVALIDATION ERRORS:\n' + Object.values(errors).join('\n') : ''}`;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loop_calculator_results_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetToDefaults = () => {
    setSupplyVoltage(24);
    setWireType('AWG');
    setWireSize('18');
    setWireLength(100);
    setNumTransmitters(1);
    setTransmitterResistance(250);
    setNumReceivers(1);
    setReceiverResistance(250);
    setOutputVoltageMin(1);
    setOutputVoltageMax(5);
    setCustomBurdenResistor('');
    setErrors({});
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Calculator className="h-10 w-10 text-blue-600 mr-3" />
              <Zap className="h-5 w-5 text-yellow-500 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              4-20mA Loop Calculator
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Professional tool for calculating current loop parameters, voltage drops, and power supply requirements
          </p>
        </div>

        {/* Error Banner */}
        {hasErrors && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Input Parameters
              </h2>
              <button
                onClick={resetToDefaults}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Power Supply */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Power Supply
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supply Voltage (V)
                  </label>
                  <input
                    type="number"
                    value={supplyVoltage}
                    onChange={(e) => setSupplyVoltage(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.supplyVoltage ? 'border-red-300' : 'border-gray-300'
                    }`}
                    step="0.1"
                    min="12"
                    max="48"
                  />
                  {errors.supplyVoltage && (
                    <p className="text-red-600 text-xs mt-1">{errors.supplyVoltage}</p>
                  )}
                </div>
              </div>

              {/* Wire Configuration */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Wire Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={wireType}
                      onChange={(e) => setWireType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      <option value="AWG">AWG</option>
                      <option value="Metric">mm²</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                    <select
                      value={wireSize}
                      onChange={(e) => setWireSize(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      {wireType === 'AWG' ? 
                        Object.keys(WIRE_RESISTANCE_AWG).map(size => (
                          <option key={size} value={size}>{size} AWG</option>
                        )) :
                        Object.keys(WIRE_RESISTANCE_METRIC).map(size => (
                          <option key={size} value={size}>{size} mm²</option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Length ({wireType === 'AWG' ? 'feet' : 'meters'})
                    </label>
                    <input
                      type="number"
                      value={wireLength}
                      onChange={(e) => setWireLength(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.wireLength ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="1"
                      max="10000"
                    />
                    {errors.wireLength && (
                      <p className="text-red-600 text-xs mt-1">{errors.wireLength}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Components */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Loop Components</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transmitters</label>
                    <input
                      type="number"
                      value={numTransmitters}
                      onChange={(e) => setNumTransmitters(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.numTransmitters ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      max="10"
                    />
                    {errors.numTransmitters && (
                      <p className="text-red-600 text-xs mt-1">{errors.numTransmitters}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resistance (Ω each)</label>
                    <input
                      type="number"
                      value={transmitterResistance}
                      onChange={(e) => setTransmitterResistance(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.transmitterResistance ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      max="10000"
                    />
                    {errors.transmitterResistance && (
                      <p className="text-red-600 text-xs mt-1">{errors.transmitterResistance}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Receivers</label>
                    <input
                      type="number"
                      value={numReceivers}
                      onChange={(e) => setNumReceivers(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.numReceivers ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      max="10"
                    />
                    {errors.numReceivers && (
                      <p className="text-red-600 text-xs mt-1">{errors.numReceivers}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resistance (Ω each)</label>
                    <input
                      type="number"
                      value={receiverResistance}
                      onChange={(e) => setReceiverResistance(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.receiverResistance ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                      max="10000"
                    />
                    {errors.receiverResistance && (
                      <p className="text-red-600 text-xs mt-1">{errors.receiverResistance}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Output Configuration */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Voltage Output Range</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min (V)</label>
                    <input
                      type="number"
                      value={outputVoltageMin}
                      onChange={(e) => setOutputVoltageMin(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                      step="0.1"
                      min="0"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max (V)</label>
                    <input
                      type="number"
                      value={outputVoltageMax}
                      onChange={(e) => setOutputVoltageMax(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
                      step="0.1"
                      min="0"
                      max="50"
                    />
                  </div>
                </div>
                {errors.outputVoltageRange && (
                  <p className="text-red-600 text-xs mt-2">{errors.outputVoltageRange}</p>
                )}
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Burden Resistor (Ω) - Optional
                  </label>
                  <input
                    type="number"
                    value={customBurdenResistor}
                    onChange={(e) => setCustomBurdenResistor(e.target.value)}
                    placeholder="Leave empty to use calculated value"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.customBurdenResistor ? 'border-red-300' : 'border-gray-300'
                    }`}
                    min="0"
                    max="100000"
                  />
                  {errors.customBurdenResistor && (
                    <p className="text-red-600 text-xs mt-1">{errors.customBurdenResistor}</p>
                  )}
                </div>
              </div>

              {/* Advanced Options */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                </button>
                {showAdvanced && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Advanced options for fine-tuning calculations and additional parameters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Calculation Results
              </h2>
              <button
                onClick={exportResults}
                disabled={hasErrors}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>

            {hasErrors ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Please fix the input errors to see calculation results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Loop Resistance */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Loop Resistance</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Wire Resistance:</div>
                    <div className="font-mono">{results.wireResistance.toFixed(2)} Ω</div>
                    <div>Total Loop Resistance:</div>
                    <div className="font-mono font-semibold text-blue-600 text-lg">{results.totalLoopResistance.toFixed(2)} Ω</div>
                  </div>
                </div>

                {/* Voltage Drops */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Voltage Drops</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>At 4 mA:</div>
                    <div className="font-mono">{results.voltageDrop4mA.toFixed(2)} V</div>
                    <div>At 20 mA:</div>
                    <div className="font-mono">{results.voltageDrop20mA.toFixed(2)} V</div>
                  </div>
                </div>

                {/* Burden Resistor */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Burden Resistor</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Calculated Value:</div>
                    <div className="font-mono">{results.recommendedBurdenResistor.toFixed(1)} Ω</div>
                    <div>Nearest Standard:</div>
                    <div className="font-mono font-semibold text-green-600 text-lg">{results.nearestStandardResistor} Ω</div>
                  </div>
                </div>

                {/* Power Supply Check */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Power Supply Adequacy</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">At 4 mA:</span>
                      <div className="flex items-center">
                        {results.powerSupplyAdequate4mA ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className={`font-semibold ${results.powerSupplyAdequate4mA ? 'text-green-600' : 'text-red-600'}`}>
                          {results.powerSupplyAdequate4mA ? 'OK' : 'NOT OK'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">At 20 mA:</span>
                      <div className="flex items-center">
                        {results.powerSupplyAdequate20mA ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className={`font-semibold ${results.powerSupplyAdequate20mA ? 'text-green-600' : 'text-red-600'}`}>
                          {results.powerSupplyAdequate20mA ? 'OK' : 'NOT OK'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Headroom */}
                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Available Headroom</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>At 4 mA:</div>
                    <div className={`font-mono ${results.headroomVoltage4mA >= 12 ? 'text-green-600' : 'text-red-600'}`}>
                      {results.headroomVoltage4mA.toFixed(2)} V
                    </div>
                    <div>At 20 mA:</div>
                    <div className={`font-mono ${results.headroomVoltage20mA >= 12 ? 'text-green-600' : 'text-red-600'}`}>
                      {results.headroomVoltage20mA.toFixed(2)} V
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Minimum 12V headroom recommended for proper transmitter operation
                  </p>
                </div>

                {/* Additional Metrics */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Additional Metrics</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Loop Efficiency:</div>
                    <div className="font-mono">{results.loopEfficiency.toFixed(1)}%</div>
                    {results.maxWireLength > 0 && (
                      <>
                        <div>Max Wire Length:</div>
                        <div className="font-mono">{results.maxWireLength.toFixed(0)} {wireType === 'AWG' ? 'feet' : 'meters'}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Warnings */}
                {(!results.powerSupplyAdequate4mA || !results.powerSupplyAdequate20mA) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-red-800">Warning: Insufficient Power Supply</h4>
                        <p className="text-sm text-red-700 mt-1">
                          The power supply voltage is too low for this loop configuration. 
                          Consider increasing supply voltage or reducing loop resistance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Quick Reference
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Common Output Ranges</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>1-5 V:</span>
                  <span className="font-mono">250 Ω burden</span>
                </div>
                <div className="flex justify-between">
                  <span>2-10 V:</span>
                  <span className="font-mono">500 Ω burden</span>
                </div>
                <div className="flex justify-between">
                  <span>0-10 V:</span>
                  <span className="font-mono">500 Ω burden</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Typical Component Resistance</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Transmitters:</span>
                  <span>250-600 Ω</span>
                </div>
                <div className="flex justify-between">
                  <span>Receivers:</span>
                  <span>250-500 Ω</span>
                </div>
                <div className="flex justify-between">
                  <span>Min Headroom:</span>
                  <span>12 V</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoopCalculator;