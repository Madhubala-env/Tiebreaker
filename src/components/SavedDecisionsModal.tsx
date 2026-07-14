import React, { useState } from "react";
import { SavedDecision } from "../types";
import { X, Search, Trash2, Calendar, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SavedDecisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDecisions: SavedDecision[];
  onSelect: (decision: SavedDecision) => void;
  onDelete: (id: string) => void;
}

export default function SavedDecisionsModal({
  isOpen,
  onClose,
  savedDecisions,
  onSelect,
  onDelete,
}: SavedDecisionsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDecisions = savedDecisions.filter((d) =>
    d.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.options.some((o) => o.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-2xl overflow-hidden rounded bg-editorial-card shadow-2xl border border-editorial-border flex flex-col max-h-[80vh] z-10"
          >
            {/* Header */}
            <div className="p-6 border-b border-editorial-border flex items-center justify-between bg-editorial-bg">
              <div>
                <span className="editorial-label text-editorial-gold block mb-1">HISTORY LOG</span>
                <h3 className="text-xl font-serif-editorial italic font-semibold text-editorial-white">
                  Decision Archive
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded text-editorial-text-muted hover:text-editorial-white hover:bg-editorial-card-light transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-editorial-border bg-editorial-card">
              <div className="relative">
                <Search className="w-4 h-4 text-editorial-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter archived decisions or option names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-editorial-bg border border-editorial-border rounded text-editorial-white focus:outline-none focus:ring-1 focus:ring-editorial-gold focus:border-editorial-gold transition-all text-sm placeholder-editorial-text-muted/50"
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-editorial-card-light/20">
              {filteredDecisions.length === 0 ? (
                <div className="text-center py-12 text-editorial-text-muted">
                  <p className="text-base font-serif-editorial italic font-semibold text-editorial-white">No entries found</p>
                  <p className="text-xs text-editorial-text-muted/75 mt-1 font-mono uppercase tracking-wider">
                    {searchQuery ? "Try a different search query" : "Your previous decision worksheets will be saved here"}
                  </p>
                </div>
              ) : (
                filteredDecisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="group border border-editorial-border rounded p-4 hover:border-editorial-gold transition-all bg-editorial-bg flex items-start justify-between gap-4"
                  >
                    <div
                      onClick={() => onSelect(decision)}
                      className="flex-1 cursor-pointer space-y-2.5"
                    >
                      <h4 className="text-base font-serif-editorial italic font-medium text-editorial-white line-clamp-2 leading-snug group-hover:text-editorial-gold transition-colors">
                        {decision.decision}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] uppercase font-mono tracking-wider text-editorial-text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-editorial-gold" />
                          {new Date(decision.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="opacity-45">•</span>
                        <span className="text-editorial-white bg-editorial-card px-2 py-0.5 rounded border border-editorial-border">
                          {decision.options.length} options
                        </span>
                        <span className="opacity-45">•</span>
                        <span className="text-black bg-editorial-gold font-bold px-2 py-0.5 rounded">
                          Winner: {decision.result.verdict.recommendedOption}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-center shrink-0">
                      <button
                        onClick={() => onSelect(decision)}
                        className="p-2 text-editorial-text-muted hover:text-editorial-gold hover:bg-editorial-card-light rounded transition-all cursor-pointer"
                        title="Load analysis"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(decision.id);
                        }}
                        className="p-2 text-editorial-text-muted hover:text-red-400 hover:bg-red-950/20 rounded transition-all cursor-pointer"
                        title="Delete from archive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-editorial-border bg-editorial-bg flex justify-between items-center text-xs text-editorial-text-muted font-mono uppercase tracking-widest">
              <span>SYSTEM ARCHIVE ACTIVE</span>
              <span>TOTAL ENTRIES: {savedDecisions.length}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
