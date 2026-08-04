import React, { useState } from 'react';
import { Globe, MapPin, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { countryCodes } from '@/lib/countryCodes';
import { useToast } from '@/hooks/use-toast';
import { Api } from '@/lib/api';

interface MissingCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  academyId: string;
  onSuccess: (updatedCountry: string) => void;
}

const countriesList = Array.from(
  new Map(countryCodes.map(c => [c.country, c])).values()
).sort((a, b) => a.country.localeCompare(b.country));

export default function MissingCountryModal({
  isOpen,
  onClose,
  academyId,
  onSuccess,
}: MissingCountryModalProps) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry) {
      setError('Please select a country');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await Api.put<any>(`/academies/${academyId}`, {
        province: selectedCountry,
        country: selectedCountry,
      });

      if (response.success) {
        // Also update local storage
        const currentData = JSON.parse(localStorage.getItem('academy_data') || '{}');
        const updatedData = {
          ...currentData,
          country: selectedCountry,
          province: selectedCountry,
        };
        localStorage.setItem('academy_data', JSON.stringify(updatedData));

        toast({
          title: 'Country Updated! 🌐',
          description: `Your academy country has been set to ${selectedCountry}.`,
        });

        onSuccess(selectedCountry);
        onClose();
      } else {
        throw new Error(response.error || response.message || 'Failed to update country');
      }
    } catch (err: any) {
      const msg = err?.message || 'An error occurred while updating country';
      setError(msg);
      toast({
        title: 'Update Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-2xl overflow-hidden p-0">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 p-6 text-white text-center relative">
          <div className="mx-auto w-16 h-16 bg-yellow-400/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 border border-yellow-400/30">
            <Globe className="h-8 w-8 text-yellow-400" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
            Select Your Country
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs mt-1">
            Action required: Complete your academy location details
          </DialogDescription>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Your academy profile is missing a country. Setting your country enables accurate talent circular matching, currency selection, and regional scout discovery.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="modal-country-select" className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              Country
            </label>
            <select
              id="modal-country-select"
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-yellow-400 focus:outline-none transition-all font-medium text-slate-900 bg-slate-50/50"
              required
            >
              <option value="" disabled>Choose your country...</option>
              {countriesList.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.flag} {c.country}
                </option>
              ))}
            </select>
            {error && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 py-5 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
            >
              Remind Me Later
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedCountry}
              className="flex-1 py-5 bg-gradient-to-r from-slate-900 to-blue-900 hover:from-blue-900 hover:to-slate-900 text-yellow-400 font-black uppercase tracking-wider shadow-lg border border-yellow-400/30"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Country'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
