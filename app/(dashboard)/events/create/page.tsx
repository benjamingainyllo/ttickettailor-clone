"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, ImagePlus, Loader2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { bandFeeKobo, formatKobo, parseNairaInput } from "@/lib/money";
import { toast } from "sonner";

export default function CreateEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFree, setIsFree] = useState(false);
  const [passFeeToBuyer, setPassFeeToBuyer] = useState(false);


  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    mapLink: "",
    description: "",
    price: "0",
  });
  // Shows the organiser the actual consequence of the switch, at the price
  // they have typed. An abstract explanation of a fee never lands; a number does.
  const previewPriceKobo = isFree ? 0 : (parseNairaInput(formData.price) ?? 0);
  const previewFeeKobo = previewPriceKobo > 0 ? bandFeeKobo(previewPriceKobo) : 0;
  const feePreview =
    previewPriceKobo > 0
      ? {
          buyerPays: formatKobo(passFeeToBuyer ? previewPriceKobo + previewFeeKobo : previewPriceKobo),
          youGet: formatKobo(passFeeToBuyer ? previewPriceKobo : previewPriceKobo - previewFeeKobo),
        }
      : null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (!user) {
      toast.error("You need to be signed in.");
      return;
    }

    const priceKobo = isFree ? 0 : parseNairaInput(formData.price);
    if (priceKobo === null) {
      toast.error("Enter a valid ticket price.");
      return;
    }

    setIsSaving(true);

    try {
      let coverImageUrl: string | null = null;
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("event_covers")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("event_covers").getPublicUrl(filePath);

        coverImageUrl = publicUrl;
      }

      // Created as a DRAFT. Publishing is a separate, gated step — a paid
      // event can't go live until a bank account is connected.
      const { data: created, error: insertError } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          title: formData.title,
          description: formData.description,
          date: formData.date || null,
          time: formData.time,
          location: formData.location,
          map_link: formData.mapLink,
          price_kobo: priceKobo,
          cover_image_url: coverImageUrl,
          status: "Upcoming",
          publish_status: "draft",
          pass_fee_to_buyer: passFeeToBuyer,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // An event sells ticket TYPES, not a bare price — with none it can't
      // sell anything at all. The price typed here becomes the first one,
      // and more can be added from the event's Tickets tab.
      const { error: tierError } = await supabase.from("ticket_types").insert({
        event_id: created.id,
        name: "General Admission",
        price_kobo: priceKobo,
        sort_order: 0,
      });

      if (tierError) throw tierError;

      toast.success("Event saved as a draft.");
      router.push("/events");
      router.refresh();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not create the event. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <div className="flex h-screen w-full bg-[#0c0c0e] overflow-hidden text-white">
        {/* Left Sidebar */}
        <div className="w-[300px] border-r border-zinc-800 bg-zinc-900/50 flex-col hidden lg:flex">
          <div className="p-6">
            <button 
              onClick={() => router.push('/events')}
              className="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-400 mb-8 transition-colors"
            >
              <span className="text-xl leading-none">&lsaquo;</span> Back to events
            </button>

            {/* Event Preview Card */}
            <div className="rounded-xl border border-zinc-800 bg-[#0c0c0e] overflow-hidden shadow-lg mb-8">
              <div className="h-20 w-full bg-gradient-to-r from-orange-500 to-rose-500 relative">
                {imagePreview && <img src={imagePreview} className="w-full h-full object-cover mix-blend-overlay opacity-50" />}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white text-base truncate">{formData.title || "Untitled Event"}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                  <CalendarIcon className="h-3 w-3" />
                  {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 w-fit text-xs text-zinc-300">
                  Draft <span className="opacity-50">▾</span>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-2">Steps</p>
              <div className="flex items-start gap-3 rounded-lg bg-blue-500/10 px-3 py-2">
                <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-[4px] border-blue-500 bg-[#0c0c0e]"></div>
                <div>
                  <p className="text-sm font-semibold text-blue-500">Build event page</p>
                  <p className="text-xs text-zinc-500 mt-1">Add all of your event details and let attendees know what to expect</p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-3 py-2 opacity-50">
                <div className="mt-0.5 flex h-4 w-4 rounded-full border border-zinc-600"></div>
                <p className="text-sm font-medium text-zinc-400">Add tickets</p>
              </div>
              <div className="flex items-start gap-3 px-3 py-2 opacity-50">
                <div className="mt-0.5 flex h-4 w-4 rounded-full border border-zinc-600"></div>
                <p className="text-sm font-medium text-zinc-400">Publish</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col h-full bg-[#0c0c0e] overflow-hidden relative">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="flex items-center justify-between border-b border-zinc-800 p-4 lg:hidden">
            <button onClick={() => router.push('/events')} className="text-sm text-zinc-400">&lsaquo; Back</button>
            <span className="text-sm font-bold text-white">Create Event</span>
            <div className="w-10"></div>
          </div>

          <form className="flex-1 overflow-y-auto pb-32" onSubmit={handleCreateEvent}>
            <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
              
              {/* Hero Image Upload */}
              <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 aspect-video group cursor-pointer" onClick={() => fileInputRef.current?.click()} onDrop={handleImageDrop} onDragOver={(e) => e.preventDefault()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                     <ImagePlus className="w-16 h-16 opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-4 shadow-xl hover:bg-zinc-100 transition-colors">
                     <ImagePlus className="h-6 w-6 text-blue-600 mb-2" />
                     <span className="text-sm font-bold text-blue-600">Upload photo</span>
                  </div>
                </div>
                {/* Floating Action Button (Always visible on empty state) */}
                {!imagePreview && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-4 shadow-xl hover:bg-zinc-100 transition-colors">
                       <ImagePlus className="h-6 w-6 text-blue-600 mb-2" />
                       <span className="text-sm font-bold text-blue-600">Upload photo</span>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {/* Event Title Block */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Event Title" 
                  className="w-full bg-transparent text-3xl font-bold text-white placeholder:text-zinc-600 focus:outline-none mb-2"
                />
                <p className="text-sm text-zinc-500">A short and sweet sentence about your event.</p>
              </div>

              {/* Date & Location Block */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
                <div className="grid sm:grid-cols-2 gap-8">
                  {/* Date and Time */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6">Date and time</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Start Date & Time</label>
                        <div className="flex gap-2">
                          <input 
                            type="date" 
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
                          />
                          <input 
                            type="time" 
                            required
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="w-28 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6">Location</h3>
                    <div className="flex gap-3">
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
                        <MapPin className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text" 
                          required
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Enter a location" 
                          className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-zinc-500 focus:outline-none mb-1"
                        />
                        <input 
                          type="url" 
                          value={formData.mapLink}
                          onChange={(e) => setFormData({ ...formData, mapLink: e.target.value })}
                          placeholder="Virtual link (optional)" 
                          className="w-full bg-transparent text-xs text-blue-500 placeholder:text-blue-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Block */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Overview</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Use this section to provide more details about your event. You can include things to know, venue information, accessibility options—anything that will help people know what to expect.
                </p>
                <textarea 
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add Description" 
                  className="w-full resize-none rounded-xl bg-zinc-800 p-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              {/* Pricing Block */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
                <h3 className="text-xl font-bold text-white mb-6">Ticketing</h3>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-800/30">
                  <div>
                    <p className="text-sm font-semibold text-white">Event Price</p>
                    <p className="text-xs text-zinc-500 mt-1">Is this event free or paid?</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setIsFree(!isFree); if (!isFree) setFormData({ ...formData, price: "0" }); }}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isFree ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                    >
                      {isFree ? 'Free Event' : 'Paid'}
                    </button>
                    {!isFree && (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">₦</span>
                        <input 
                          type="number" 
                          required
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="0"
                          className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 pl-8 pr-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {!isFree && (
                  <div className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-800/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-md">
                      <p className="text-sm font-semibold text-white">Who pays our fee?</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Add it to the buyer&apos;s total and you keep the full ticket
                        price. Absorb it and the buyer sees a round number.
                      </p>
                      {feePreview && (
                        <p className="mt-2 text-xs font-medium text-zinc-300">
                          Buyer pays{" "}
                          <span className="text-white">{feePreview.buyerPays}</span>
                          {" · "}you receive{" "}
                          <span className="text-emerald-400">{feePreview.youGet}</span>
                          <span className="text-zinc-500"> (before your bank&apos;s card charges)</span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPassFeeToBuyer(!passFeeToBuyer)}
                      className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                        passFeeToBuyer
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {passFeeToBuyer ? "Buyer pays it" : "I'll absorb it"}
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-[#0c0c0e] p-4 flex justify-end gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <button 
                type="button"
                disabled={isSaving}
                onClick={() => router.push('/events')}
                className="px-6 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Discard
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center min-w-[160px] rounded-lg bg-[#d94826] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#c13d1d] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save draft"}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
