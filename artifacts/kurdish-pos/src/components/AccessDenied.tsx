import { ShieldOff } from "lucide-react";

export default function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-rose-100 flex items-center justify-center mb-6">
        <ShieldOff className="w-10 h-10 text-rose-400" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-800 mb-2">مافت نییە</h2>
      <p className="text-slate-500 text-base max-w-xs">
        {message ?? "بەڕێوەبەرەکە مافی بینینی ئەم بەشە پێت نەداوە. پەیوەندی بەڕێوەبەر بکە."}
      </p>
    </div>
  );
}
