import React, { useState } from "react";
import "./CreatePlanModal.css";
import "../../styles/globals.css";
import toast from "react-hot-toast";
import api from "../../api/axios";

const UNITS = ["g", "kg", "ml", "l", "cup", "tbsp", "tsp", "piece"];

const emptyItem = () => ({ food: "", time: "", quantity: "", unit: "g", calories: "", notes: "", });
const CreatePlanModal = ({ onClose, onSave, plan }) => {
    const isEdit = !!plan;

    const [planName, setPlanName] = useState(plan?.name ?? "");
    const [foodType, setFoodType] = useState(plan?.foodType || "veg");
    const [items, setItems] = useState(
        plan?.items?.length
            ? plan.items.map(i => ({
                food: i.food,
                time: i.time,
                quantity: i.quantity,
                unit: i.unit,
                calories: i.calories,
                notes: i.notes || "",
            }))
            : [emptyItem()]
    );

    const addItem = () => setItems(prev => [...prev, emptyItem()]);

    const removeItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const totalCalories = items.reduce((sum, item) => sum + (parseInt(item.calories) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await api.put(`/members/diet-plans/${plan.id}/`, { name: planName, foodType: foodType || "veg", items });
                toast.success("Plan updated!");
            } else {
                await api.post("/members/diet-plans/", { name: planName, foodType: foodType || "veg", items });
                toast.success("Plan created!");
            }
            onSave();
        } catch (error) {
            toast.error(isEdit ? "Error updating plan!" : "Error creating plan!");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal animate-in">

                <div className="modal-header">
                    <h2>{isEdit ? "Edit Diet Plan" : "New Diet Plan"}</h2>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
                </div>

                <div className="plan-name-input">
                    <input
                        className="form-input"
                        placeholder="Plan name (e.g. Weight Loss Plan)"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="form-label">Food Types</label>
                    <select className="form-input" value={foodType} onChange={e => setFoodType(e.target.value)}>
                        <option value="veg">Vegetarian</option>
                        <option value="nonveg">Non-Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <p className="modal-meta">
                    <span>{items.length}</span> items &nbsp;·&nbsp; <span>{totalCalories} kcal</span> total
                </p>

                <div className="item-row item-row-header">
                    <span>Food</span>
                    <span>Qty</span>
                    <span>Unit</span>
                    <span>Time</span>
                    <span>kcal</span>
                    <span>Delete</span>
                    <span>Notes</span>
                </div>

                {items.map((item, index) => (
                    <div key={index} className="item-row">
                        <input
                            className="form-input"
                            placeholder="Food item"
                            value={item.food}
                            onChange={(e) => handleChange(index, "food", e.target.value)}
                        />
                        <input
                            className="form-input"
                            type="number"
                            placeholder="100"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleChange(index, "quantity", e.target.value)}
                        />
                        <select
                            className="form-input"
                            value={item.unit}
                            onChange={(e) => handleChange(index, "unit", e.target.value)}
                        >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input
                            className="form-input"
                            type="time"
                            value={item.time}
                            onChange={(e) => handleChange(index, "time", e.target.value)}
                        />
                        <input
                            className="form-input"
                            type="number"
                            placeholder="kcal"
                            min="0"
                            value={item.calories}
                            onChange={(e) => handleChange(index, "calories", e.target.value)}
                        />
                        <button className="btn-remove" onClick={() => removeItem(index)}>🗑</button>
                        <input placeholder="Notes"
                            className="form-input"
                            value={item.notes}
                            onChange={(e) => handleChange(index, "notes", e.target.value)} />
                    </div>
                ))}

                <button className="add-item-btn" onClick={addItem}>+ Add food item</button>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        {isEdit ? "Save Changes" : "Create Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePlanModal;
