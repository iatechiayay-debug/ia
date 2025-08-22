import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Info, 
  HelpCircle,
  Zap,
  Settings,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

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

// Validation rules
const VALIDATION_RULES = {
  supplyVoltage: { min: 5, max: 50, default: 24 },
  wireLength: { min: 0.1, max: 10000, default: 100 },
  numTransmitters: { min: 0, max: 10, default: 1 },
  transmitterResistance: { min: 0, max: 2000, default: 250 },
  numReceivers: { min: 0, max: 10, default: 1 },
  receiverResistance: { min: 0, max: 2000, default: 250 },
  outputVoltageMin: { min: 0, max: 20, default: 1 },
  outputVoltageMax: { min: 0, max: 20, default: 5 },
  customBurdenResistor: { min: 0, max: 10000, default: '' }
};

// Tooltip content
const TOOLTIPS = {
  supplyVoltage: "The DC voltage provided by your power supply (typically 24V)",
  wireLength: "Total one-way distance from power supply to transmitter",
  transmitters: "Devices that generate the 4-20mA signal (sensors, etc.)",
  receivers: "Devices that read the 4-20mA signal (PLCs, controllers, etc.)",
  burdenResistor: "Resistor used to convert current signal to voltage",
  headroom: "Minimum voltage needed for proper transmitter operation"
};

const LoopCalculator = () => {
  // Input states with validation
  const [inputs, setInputs] = useState({
    supplyVoltage: 24,
    wireType: 'AWG',
    wireSize: '18',
    wireLength: 100,
    numTransmitters: 1,
    transmitterResistance: 250,
    numReceivers: 1,
    receiverResistance: 250,
    outputVoltageMin: 1,
    outputVoltageMax: 5,
    customBurdenResistor: ''
  });

  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);

  // Validation function
  const validateInput = useCallback((name, value) => {
    const rules = VALIDATION_RULES[name];
    if (!rules) return null;

    const numValue = parseFloat(value);
    if (isNaN(numValue) && value !== '') return `${name} must be a valid number`;
    if (numValue < rules.min) return `${name} must be at least ${rules.min}`;
    if (numValue > rules.max) return `${name} cannot exceed ${rules.max}`;
    if (name === 'outputVoltageMax' && numValue <= inputs.outputVoltageMin) {
      return 'Max voltage must be greater than min voltage';
    }
    return null;
  }, [inputs.outputVoltageMin]);

  // Input handler with validation
  const handleInputChange = useCallback((name, value) => {
    setInputs(prev => ({ ...prev, [name]: value }));
    
    const error = validateInput(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, [validateInput]);

  // Calculate wire resistance with fixed conversion
  const calculateWireResistance = useCallback(() => {
    const resistanceTable = inputs.wireType === 'AWG' ? WIRE_RESISTANCE_AWG : WIRE_RESISTANCE_METRIC;
    const resistancePerKm = resistanceTable[inputs.wireSize] || 0;
    
    // Fixed conversion: AWG uses feet, convert to meters first, then to km
    let lengthInKm;
    if (inputs.wireType === 'AWG') {
      lengthInKm = (inputs.wireLength * 0.3048) / 1000; // feet to meters to km
    } else {
      lengthInKm = inputs.wireLength / 1000; // meters to km
    }
    
    return resistancePerKm * lengthInKm * 2; // Round trip
  }, [inputs.wireType, inputs.wireSize, inputs.wireLength]);

  // Find nearest standard resistor value
  const findNearestStandardResistor = useCallback((targetValue) => {
    return STANDARD_RESISTORS.reduce((prev, curr) => 
      Math.abs(curr - targetValue) < Math.abs(prev - targetValue) ? curr : prev
    );
  }, []);

  // Calculate burden resistor for desired voltage output
  const calculateBurdenResistor = useCallback(() => {
    const voltageRange = inputs.outputVoltageMax - inputs.outputVoltageMin;
    const currentRange = 0.016; // 20mA - 4mA = 16mA
    return (voltageRange / currentRange) * 1000; // Convert to ohms
  }, [inputs.outputVoltageMin, inputs.outputVoltageMax]);

  // Memoized calculations
  const results = useMemo(() => {
    if (Object.values(errors).some(error => error)) {
      return null; // Don't calculate if there are errors
    }

    const wireRes = calculateWireResistance();
    const totalTransmitterRes = inputs.numTransmitters * inputs.transmitterResistance;
    const totalReceiverRes = inputs.numReceivers * inputs.receiverResistance;
    const recommendedBurden = calculateBurdenResistor();
    const burdenRes = inputs.customBurdenResistor ? parseFloat(inputs.customBurdenResistor) : recommendedBurden;
    const nearestStandard = findNearestStandardResistor(recommendedBurden);
    
    const totalLoopRes = wireRes + totalTransmitterRes + totalReceiverRes + burdenRes;
    
    const vDrop4mA = 0.004 * totalLoopRes; // 4mA
    const vDrop20mA = 0.020 * totalLoopRes; // 20mA
    
    const minHeadroom = 12; // Typical headroom needed
    const adequate4mA = inputs.supplyVoltage >= (vDrop4mA + minHeadroom);
    const adequate20mA = inputs.supplyVoltage >= (vDrop20mA + minHeadroom);
    
    const headroom4mA = inputs.supplyVoltage - vDrop4mA;
    const headroom20mA = inputs.supplyVoltage - vDrop20mA;
    
    return {
      wireResistance: wireRes,
      totalLoopResistance: totalLoopRes,
      voltageDrop4mA: vDrop4mA,
      voltageDrop20mA: vDrop20mA,
      recommendedBurdenResistor: recommendedBurden,
      nearestStandardResistor: nearestStandard,
      powerSupplyAdequate4mA: adequate4mA,
      powerSupplyAdequate20mA: adequate20mA,
      headroomVoltage4mA: headroom4mA,
      headroomVoltage20mA: headroom20mA
    };
  }, [
    inputs,
    errors,
    calculateWireResistance,
    calculateBurdenResistor,
    findNearestStandardResistor
  ]);

  // Export results with better formatting
  const exportResults = useCallback(() => {
    if (!results) return;

    const data = `4-20mA LOOP CALCULATOR RESULTS
${'='.repeat(40)}
Generated: ${new Date().toLocaleString()}

INPUT PARAMETERS:
${'-'.repeat(20)}
Supply Voltage: ${inputs.supplyVoltage} V
Wire Type: ${inputs.wireType} ${inputs.wireSize}
Wire Length: ${inputs.wireLength} ${inputs.wireType === 'AWG' ? 'feet' : 'meters'}
Transmitters: ${inputs.numTransmitters} × ${inputs.transmitterResistance}Ω
Receivers: ${inputs.numReceivers} × ${inputs.receiverResistance}Ω
Output Range: ${inputs.outputVoltageMin}-${inputs.outputVoltageMax} V
${inputs.customBurdenResistor ? `Custom Burden Resistor: ${inputs.customBurdenResistor} Ω` : ''}

CALCULATED RESULTS:
${'-'.repeat(20)}
Wire Resistance: ${results.wireResistance.toFixed(2)} Ω
Total Loop Resistance: ${results.totalLoopResistance.toFixed(2)} Ω
Voltage Drop @ 4mA: ${results.voltageDrop4mA.toFixed(2)} V
Voltage Drop @ 20mA: ${results.voltageDrop20mA.toFixed(2)} V
Recommended Burden Resistor: ${results.recommendedBurdenResistor.toFixed(1)} Ω
Nearest Standard Resistor: ${results.nearestStandardResistor} Ω

POWER SUPPLY ANALYSIS:
${'-'.repeat(20)}
Power Supply Adequate @ 4mA: ${results.powerSupplyAdequate4mA ? 'YES' : 'NO'}
Power Supply Adequate @ 20mA: ${results.powerSupplyAdequate20mA ? 'YES' : 'NO'}
Available Headroom @ 4mA: ${results.headroomVoltage4mA.toFixed(2)} V
Available Headroom @ 20mA: ${results.headroomVoltage20mA.toFixed(2)} V

RECOMMENDATIONS:
${'-'.repeat(20)}
${results.powerSupplyAdequate4mA && results.powerSupplyAdequate20mA ? 
  '✓ Loop configuration is adequate for proper operation.' :
  '⚠ WARNING: Insufficient power supply voltage for this configuration.'}
${results.headroomVoltage20mA < 12 ? 
  '⚠ Consider increasing supply voltage or reducing loop resistance.' : ''}
`;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loop_calculator_results_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, inputs]);

  // Tooltip component
  const Tooltip = ({ content, children }) => (
    <div className="relative group">
      {children}
      {showTooltips && (
        <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-2 px-3 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );

  // Input component with validation
  const ValidatedInput = ({ 
    label, 
    name, 
    type = "number", 
    step, 
    min, 
    max, 
    placeholder, 
    tooltip,
    unit,
    ...props 
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          {label}
          {unit && <span className="text-gray-500 text-xs">({unit})</span>}
          {tooltip && (
            <Tooltip content={tooltip}>
              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </Tooltip>
          )}
        </div>
      </label>
      <input
        type={type}
        value={inputs[name]}
        onChange={(e) => handleInputChange(name, e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
          errors[name] 
            ? 'border-red-300 focus:border-red-500' 
            : 'border-gray-300 focus:border-blue-500'
        }`}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...props}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full mr-4">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">4-20mA Loop Calculator</h1>
              <div className="flex items-center justify-center mt-2 text-sm text-gray-600">
                <Zap className="h-4 w-4 mr-1" />
                Professional Industrial Automation Tool
              </div>
            </div>
          </div>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            Calculate current loop parameters, voltage drops, and power supply requirements 
            with precision and confidence for your industrial control systems.
          </p>
          
          {/* Help toggle */}
          <button
            onClick={() => setShowTooltips(!showTooltips)}
            className={`mt-4 px-4 py-2 rounded-lg transition-colors ${
              showTooltips 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border border-gray-300'
            }`}
          >
            <HelpCircle className="h-4 w-4 inline mr-2" />
            {showTooltips ? 'Hide' : 'Show'} Help Tips
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Enhanced Input Section */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              Configuration Parameters
            </h2>
            
            <div className="space-y-6">
              {/* Power Supply */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Power Supply
                </h3>
                <ValidatedInput
                  label="Supply Voltage"
                  name="supplyVoltage"
                  step="0.1"
                  min="5"
                  max="50"
                  unit="V"
                  tooltip={TOOLTIPS.supplyVoltage}
                />
              </div>

              {/* Wire Configuration */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Wire Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={inputs.wireType}
                      onChange={(e) => handleInputChange('wireType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="AWG">AWG</option>
                      <option value="Metric">mm²</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                    <select
                      value={inputs.wireSize}
                      onChange={(e) => handleInputChange('wireSize', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {inputs.wireType === 'AWG' ? 
                        Object.keys(WIRE_RESISTANCE_AWG).map(size => (
                          <option key={size} value={size}>{size} AWG</option>
                        )) :
                        Object.keys(WIRE_RESISTANCE_METRIC).map(size => (
                          <option key={size} value={size}>{size} mm²</option>
                        ))
                      }
                    </select>
                  </div>
                  <ValidatedInput
                    label="Length"
                    name="wireLength"
                    min="0.1"
                    max="10000"
                    unit={inputs.wireType === 'AWG' ? 'feet' : 'meters'}
                    tooltip={TOOLTIPS.wireLength}
                  />
                </div>
              </div>

              {/* Components */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Loop Components</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ValidatedInput
                      label="Transmitters"
                      name="numTransmitters"
                      min="0"
                      max="10"
                      tooltip={TOOLTIPS.transmitters}
                    />
                    <ValidatedInput
                      label="Resistance Each"
                      name="transmitterResistance"
                      min="0"
                      max="2000"
                      unit="Ω"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <ValidatedInput
                      label="Receivers"
                      name="numReceivers"
                      min="0"
                      max="10"
                      tooltip={TOOLTIPS.receivers}
                    />
                    <ValidatedInput
                      label="Resistance Each"
                      name="receiverResistance"
                      min="0"
                      max="2000"
                      unit="Ω"
                    />
                  </div>
                </div>
              </div>

              {/* Output Configuration */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Voltage Output Range</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <ValidatedInput
                    label="Minimum"
                    name="outputVoltageMin"
                    step="0.1"
                    min="0"
                    max="20"
                    unit="V"
                  />
                  <ValidatedInput
                    label="Maximum"
                    name="outputVoltageMax"
                    step="0.1"
                    min="0"
                    max="20"
                    unit="V"
                  />
                </div>
                <ValidatedInput
                  label="Custom Burden Resistor"
                  name="customBurdenResistor"
                  min="0"
                  max="10000"
                  unit="Ω"
                  placeholder="Leave empty to use calculated value"
                  tooltip={TOOLTIPS.burdenResistor}
                />
              </div>
            </div>
          </div>

          {/* Enhanced Results Section */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Calculation Results
              </h2>
              <button
                onClick={exportResults}
                disabled={!results}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  results 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </button>
            </div>

            {!results ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Please correct input errors to see results</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Loop Resistance */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500">
                  <h3 className="font-medium text-gray-800 mb-3">Loop Resistance Analysis</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Wire Resistance:</div>
                    <div className="font-mono text-blue-600 font-semibold">{results.wireResistance.toFixed(2)} Ω</div>
                    <div>Total Loop Resistance:</div>
                    <div className="font-mono font-bold text-blue-700 text-lg">{results.totalLoopResistance.toFixed(2)} Ω</div>
                  </div>
                </div>

                {/* Voltage Drops */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500">
                  <h3 className="font-medium text-gray-800 mb-3">Voltage Drop Analysis</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>At 4 mA (minimum):</div>
                    <div className="font-mono text-green-600 font-semibold">{results.voltageDrop4mA.toFixed(2)} V</div>
                    <div>At 20 mA (maximum):</div>
                    <div className="font-mono text-green-700 font-semibold">{results.voltageDrop20mA.toFixed(2)} V</div>
                  </div>
                </div>

                {/* Burden Resistor */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-500">
                  <h3 className="font-medium text-gray-800 mb-3">Burden Resistor Selection</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Calculated Value:</div>
                    <div className="font-mono text-purple-600">{results.recommendedBurdenResistor.toFixed(1)} Ω</div>
                    <div>Nearest Standard (E24):</div>
                    <div className="font-mono font-bold text-purple-700 text-lg">{results.nearestStandardResistor} Ω</div>
                  </div>
                </div>

                {/* Power Supply Check */}
                <div className={`rounded-lg p-4 border-l-4 ${
                  results.powerSupplyAdequate4mA && results.powerSupplyAdequate20mA
                    ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-500'
                    : 'bg-gradient-to-r from-red-50 to-red-100 border-red-500'
                }`}>
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
                          {results.powerSupplyAdequate4mA ? 'ADEQUATE' : 'INSUFFICIENT'}
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
                          {results.powerSupplyAdequate20mA ? 'ADEQUATE' : 'INSUFFICIENT'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Headroom */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border-l-4 border-yellow-500">
                  <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                    Available Headroom
                    <Tooltip content={TOOLTIPS.headroom}>
                      <HelpCircle className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
                    </Tooltip>
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>At 4 mA:</div>
                    <div className={`font-mono font-semibold ${results.headroomVoltage4mA >= 12 ? 'text-green-600' : 'text-red-600'}`}>
                      {results.headroomVoltage4mA.toFixed(2)} V
                    </div>
                    <div>At 20 mA:</div>
                    <div className={`font-mono font-semibold ${results.headroomVoltage20mA >= 12 ? 'text-green-600' : 'text-red-600'}`}>
                      {results.headroomVoltage20mA.toFixed(2)} V
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-200 rounded text-xs text-gray-700">
                    <Info className="h-3 w-3 inline mr-1" />
                    Minimum 12V headroom recommended for reliable transmitter operation
                  </div>
                </div>

                {/* Enhanced Warnings */}
                {(!results.powerSupplyAdequate4mA || !results.powerSupplyAdequate20mA) && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-800 mb-2">Critical Warning: Insufficient Power Supply</h4>
                        <p className="text-sm text-red-700 mb-3">
                          The current power supply configuration cannot provide adequate voltage for proper loop operation.
                        </p>
                        <div className="text-sm text-red-700">
                          <strong>Recommendations:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Increase supply voltage to at least {Math.ceil(Math.max(results.voltageDrop4mA, results.voltageDrop20mA) + 12)}V</li>
                            <li>Use larger wire gauge to reduce resistance</li>
                            <li>Reduce wire length if possible</li>
                            <li>Consider using a lower burden resistor value</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Quick Reference */}
        <div className="mt-8 bg-white rounded-xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-600" />
            Quick Reference & Industry Standards
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">Common Output Ranges</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span>1-5 V:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded">250 Ω</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>2-10 V:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded">500 Ω</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>0-10 V:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded">500 Ω</span>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">Typical Resistances</h4>
              <div className="text-sm space-y-2">
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
                  <span className="font-semibold">12 V</span>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">Wire Recommendations</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Short runs (&lt;100ft):</span>
                  <span>18-20 AWG</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium runs (100-500ft):</span>
                  <span>16-18 AWG</span>
                </div>
                <div className="flex justify-between">
                  <span>Long runs (&gt;500ft):</span>
                  <span>14-16 AWG</span>
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