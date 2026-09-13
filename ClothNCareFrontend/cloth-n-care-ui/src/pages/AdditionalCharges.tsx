import MasterCrudPage from "../components/MasterCrudPage";
import {
  createChargeType,
  deleteChargeType,
  getChargeTypes,
  updateChargeType,
  type ChargeCalculation,
  type ChargeType,
  type ChargeTypePayload,
} from "../api/chargeTypes";
import { formatMoney } from "../utils/format";

const toForm = (charge: ChargeType): ChargeTypePayload => ({
  name: charge.name,
  calculation: charge.calculation,
  defaultAmount: charge.defaultAmount,
  active: charge.active,
});

const initialForm = (): ChargeTypePayload => ({
  name: "",
  calculation: "FLAT",
  defaultAmount: 0,
  active: true,
});

export default function AdditionalChargesPage() {
  return (
    <MasterCrudPage<ChargeType, ChargeTypePayload>
      title="Additional Charges"
      subtitle={(count) => `${count} charge types configured`}
      icon="percent"
      resource="charge-types"
      emptyMessage="No charge types found"
      searchKeys={["name"]}
      fetchAll={getChargeTypes}
      create={createChargeType}
      update={updateChargeType}
      remove={deleteChargeType}
      initialForm={initialForm}
      toForm={toForm}
      validate={(form) => (!form.name?.trim() ? "Name is required" : null)}
      columns={[
        {
          key: "name",
          label: "Charge Type",
          render: (charge) => <span style={{ fontWeight: 700 }}>{charge.name}</span>,
        },
        {
          key: "calculation",
          label: "Calculation",
          render: (charge) => (
            <span className={`badge ${charge.calculation === "PERCENT" ? "badge-blue" : "badge-slate"}`}>
              {charge.calculation === "PERCENT" ? "% of bill" : "Flat amount"}
            </span>
          ),
        },
        {
          key: "defaultAmount",
          label: "Default Value",
          render: (charge) => (
            <span className="cell-total">
              {charge.calculation === "PERCENT"
                ? `${charge.defaultAmount}%`
                : formatMoney(charge.defaultAmount)}
            </span>
          ),
        },
        {
          key: "active",
          label: "Status",
          render: (charge) => (
            <span className={`badge ${charge.active ? "badge-green" : "badge-slate"}`}>
              {charge.active ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      renderFields={(form, setForm) => (
        <>
          <div className="form-field">
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g., Express, Stain Removal, Delivery Fee"
              className="form-input"
              value={form.name ?? ""}
              onChange={(event) => setForm({ name: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Calculation</label>
            <select
              className="form-input"
              value={form.calculation ?? "FLAT"}
              onChange={(event) =>
                setForm({ calculation: event.target.value as ChargeCalculation })
              }
            >
              <option value="FLAT">Flat amount</option>
              <option value="PERCENT">Percentage of bill</option>
            </select>
          </div>
          <div className="form-field">
            <label>{form.calculation === "PERCENT" ? "Default %" : "Default Amount"}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="form-input"
              value={form.defaultAmount ?? ""}
              onChange={(event) => setForm({ defaultAmount: Number(event.target.value) })}
            />
          </div>
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(event) => setForm({ active: event.target.checked })}
            />
            Active
          </label>
        </>
      )}
    />
  );
}
