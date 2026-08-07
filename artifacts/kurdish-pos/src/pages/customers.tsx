import { useState } from "react";
import { useGetCustomers, useCreateCustomer, useUpdateCustomer } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2, Search, UserCircle2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

const customerSchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().min(4, "Phone required"),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function Customers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: customers = [], isLoading } = useGetCustomers();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", address: "" },
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const openAddModal = () => {
    setEditingId(null);
    form.reset({ name: "", phone: "", address: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: any) => {
    setEditingId(customer.id);
    form.reset({ name: customer.name, phone: customer.phone, address: customer.address || "" });
    setIsModalOpen(true);
  };

  const onSubmit = (data: CustomerFormData) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
            toast({ title: t("customers.customerSaved") });
            setIsModalOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
            toast({ title: t("customers.customerAdded") });
            setIsModalOpen(false);
          },
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">{t("customers.title")}</h1>
          <p className="text-slate-500 mt-1">{t("customers.subtitle")}</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/30 transition-all font-semibold"
        >
          <Plus className="w-5 h-5" />
          {t("customers.addCustomer")}
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder={t("customers.searchCustomers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
        />
        {search && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {t("customers.found", { count: filteredCustomers.length })}
            </span>
            <button
              onClick={() => setSearch("")}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-100">
            <UserCircle2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">{t("customers.noCustomers")}</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/30 border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-4 start-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(customer)} className="p-2 bg-slate-50 hover:bg-primary/10 text-primary rounded-full">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xl shadow-inner">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{customer.name}</h3>
                  <p className="text-sm text-slate-500 font-mono mt-0.5" dir="ltr">{customer.phone}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">{t("customers.totalDebt")}</p>
                <p className={`text-xl font-bold ${customer.totalDebt > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatCurrency(customer.totalDebt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold">{editingId ? t("customers.editCustomer") : t("customers.addCustomerTitle")}</h2>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("customers.fullName")}</label>
                <input {...form.register("name")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                {form.formState.errors.name && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("customers.phone")}</label>
                <input {...form.register("phone")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" dir="ltr" />
                {form.formState.errors.phone && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("customers.address")}</label>
                <textarea {...form.register("address")} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-50">
                  {editingId ? t("customers.save") : t("customers.register")}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all">
                  {t("common.close")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
