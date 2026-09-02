import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, Zap, Calendar, AlertTriangle, X, CheckCircle, 
  Info, Timer, Target 
} from 'lucide-react';
import api from '../../services/api';

/**
 * QC Deadline Selector Component
 * Allows operational managers to set flexible deadlines for QC inspections
 * 
 * Usage:
 * <QCDeadlineSelector 
 *   onSelect={(config) => handleDeadlineSelected(config)}
 *   onCancel={() => setShowModal(false)}
 *   defaultType="STANDARD"
 * />
 */
export default function QCDeadlineSelector({ 
  onSelect, 
  onCancel, 
  defaultType = 'STANDARD',
  inspectionId = null // If provided, will update existing inspection
}) {
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const { data } = await api.get('/receiving-qc/qc-inspection/deadline-presets');
      setPresets(data.data || []);
      
      // Auto-select default preset
      const defaultPreset = data.data?.find(p => p.deadline_type === defaultType);
      if (defaultPreset) {
        setSelectedPreset(defaultPreset);
      }
    } catch (error) {
      console.error('Error loading deadline presets:', error);
    }
  };

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset);
    if (preset.deadline_type === 'CUSTOM' && preset.custom_days) {
      setCustomDays(preset.custom_days.toString());
    } else {
      setCustomDays('');
    }
  };

  const handleConfirm = () => {
    if (!selectedPreset) return;

    const config = {
      type: selectedPreset.deadline_type,
      customDays: selectedPreset.deadline_type === 'CUSTOM' ? parseInt(customDays) : null,
      reason: reason.trim() || selectedPreset.description,
      presetName: selectedPreset.name
    };

    onSelect(config);
  };

  const isValid = () => {
    if (!selectedPreset) return false;
    if (selectedPreset.deadline_type === 'CUSTOM') {
      const days = parseInt(customDays);
      return days > 0 && days <= 365;
    }
    return true;
  };

  const getPresetIcon = (preset) => {
    switch (preset.deadline_type) {
      case 'STANDARD': return Clock;
      case 'NONE': return Target;
      case 'CUSTOM':
        if (preset.custom_days <= 1) return Zap;
        if (preset.custom_days <= 3) return AlertTriangle;
        if (preset.custom_days <= 7) return Timer;
        return Calendar;
      default: return Clock;
    }
  };

  const getPresetColor = (preset) => {
    if (preset.deadline_type === 'NONE') {
      return 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400';
    }
    if (preset.deadline_type === 'CUSTOM' && preset.custom_days <= 3) {
      return 'border-red-300 bg-red-50 text-red-700 hover:border-red-400';
    }
    if (preset.deadline_type === 'CUSTOM' && preset.custom_days <= 7) {
      return 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400';
    }
    return 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400';
  };

  const getSelectedColor = (preset) => {
    if (preset.deadline_type === 'NONE') {
      return 'border-slate-500 bg-slate-100 ring-2 ring-slate-400';
    }
    if (preset.deadline_type === 'CUSTOM' && preset.custom_days <= 3) {
      return 'border-red-500 bg-red-100 ring-2 ring-red-400';
    }
    if (preset.deadline_type === 'CUSTOM' && preset.custom_days <= 7) {
      return 'border-amber-500 bg-amber-100 ring-2 ring-amber-400';
    }
    return 'border-blue-500 bg-blue-100 ring-2 ring-blue-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Set QC Inspection Deadline
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a deadline option or set a custom timeline for this inspection
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mb-6 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Info size={20} className="shrink-0 text-blue-600" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Why set a deadline?</p>
            <p className="mt-1 text-blue-700">
              Deadlines help warehouse staff prioritize inspections based on business needs. 
              You can also choose "No Deadline" for special cases that should be handled based on availability.
            </p>
          </div>
        </div>

        {/* Preset Options */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Select Deadline Option
          </label>
          <div className="grid grid-cols-2 gap-3">
            {presets.map((preset) => {
              const Icon = getPresetIcon(preset);
              const isSelected = selectedPreset?.id === preset.id;
              
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                    isSelected 
                      ? getSelectedColor(preset)
                      : getPresetColor(preset)
                  }`}
                >
                  <Icon size={20} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">{preset.name}</p>
                    <p className="mt-1 text-xs opacity-80">{preset.description}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle size={18} className="shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Days Input (if CUSTOM preset with no predefined days) */}
        {selectedPreset?.deadline_type === 'CUSTOM' && !selectedPreset.custom_days && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Number of Days
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Enter number of days (1-365)"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                days
              </span>
            </div>
          </div>
        )}

        {/* Reason/Notes */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Reason (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g., Rush order for VIP customer, Seasonal product launch, etc."
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Summary */}
        {selectedPreset && (
          <div className="mb-6 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Summary</p>
            <div className="mt-2 text-sm text-slate-600">
              <p>
                <span className="font-medium">Deadline Type:</span>{' '}
                {selectedPreset.name}
              </p>
              {selectedPreset.deadline_type === 'CUSTOM' && customDays && (
                <p className="mt-1">
                  <span className="font-medium">Due In:</span>{' '}
                  {customDays} {parseInt(customDays) === 1 ? 'day' : 'days'}
                </p>
              )}
              {selectedPreset.deadline_type === 'STANDARD' && (
                <p className="mt-1">
                  <span className="font-medium">Due In:</span> 15 days (standard)
                </p>
              )}
              {selectedPreset.deadline_type === 'NONE' && (
                <p className="mt-1 text-slate-500">
                  No deadline - warehouse staff will handle based on availability
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-6 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid() || loading}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Setting Deadline...' : 'Confirm Deadline'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
