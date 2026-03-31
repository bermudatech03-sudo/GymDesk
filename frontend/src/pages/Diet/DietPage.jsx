import React, { useState, useEffect } from "react";
import CreatePlanModal from "./CreatePlanModal";
import ConfirmModal from "../../components/ConfirmModal";
import "./DietPage.css";
import "../../styles/globals.css";
import api from "../../api/axios";
import toast from "react-hot-toast";

const FOOD_TYPE_LABELS = { veg: "Vegetarian", nonveg: "Non-Vegetarian", vegan: "Vegan", other: "Other" };

const DietPage = () => {
    const [showModal, setShowModal] = useState(false);
    const [editPlan, setEditPlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const [search, setSearch] = useState("");
    const [confirmState, setConfirmState] = useState(null);

    const fetchPlans = async () => {
        try {
            const res = await api.get("/members/diet-plans/");
            const data = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
            setPlans(data);
        } catch (err) {
            console.error("Failed to fetch diet plans", err);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    const handleDelete = (plan) => {
        setConfirmState({
            title: "Delete Diet Plan",
            message: `Delete "${plan.name}"? This cannot be undone.`,
            confirmText: "Delete",
            danger: true,
            onConfirm: async () => {
                setConfirmState(null);
                try {
                    await api.delete(`/members/diet-plans/${plan.id}/`);
                    toast.success("Plan deleted");
                    fetchPlans();
                } catch {
                    toast.error("Failed to delete plan");
                }
            },
            onCancel: () => setConfirmState(null),
        });
    };

    const handleEdit = (plan) => {
        setEditPlan(plan);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setEditPlan(null);
    };

    const handleModalSave = () => {
        handleModalClose();
        fetchPlans();
    };

    const totalEntries = plans.reduce((sum, p) => sum + (p.items?.length || 0), 0);
    const totalMembersAssigned = plans.reduce((sum, p) => sum + (p.assigned_members_count || 0), 0);
    const avgKcal = plans.length
        ? Math.round(plans.reduce((sum, p) => sum + (p.items ?? []).reduce((s, i) => s + (i.calories || 0), 0), 0) / plans.length)
        : 0;

    const filtered = plans.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.items ?? []).some(i => i.food.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="diet-page">
            {confirmState && <ConfirmModal {...confirmState} />}

            {/* HEADER */}
            <div className="diet-header">
                <div>
                    <p className="tag">NUTRITION MANAGEMENT</p>
                    <h1>Diet Plans</h1>
                    <p className="sub">{plans.length} plans · {totalEntries} entries total</p>
                </div>
                <div className="diet-actions">
                    <input
                        className="form-input"
                        placeholder="Search plans or foods..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 240 }}
                    />
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + New Plan
                    </button>
                </div>
            </div>

            {/* STATS */}
            <div className="diet-stats">
                <div className="diet-stat-card">
                    <div className="label">Total Plans</div>
                    <div className="value">{plans.length}</div>
                </div>
                <div className="diet-stat-card">
                    <div className="label">Total Entries</div>
                    <div className="value">{totalEntries}</div>
                </div>
                <div className="diet-stat-card">
                    <div className="label">Avg kcal / plan</div>
                    <div className="value">{avgKcal}</div>
                </div>
                <div className="diet-stat-card">
                    <div className="label">Members Assigned</div>
                    <div className="value">{totalMembersAssigned}</div>
                </div>
            </div>

            {/* PLAN LIST */}
            {filtered.length === 0 ? (
                <div className="diet-empty">
                    <p>No diet plans yet</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Create First Plan
                    </button>
                </div>
            ) : (
                <div className="plan-list">
                    {filtered.map(plan => {
                        const totalKcal = (plan.items ?? []).reduce((s, i) => s + (i.calories || 0), 0);
                        return (
                            <div key={plan.id} className="plan-card">
                                <div className="plan-card-header">
                                    <h3>{plan.name}</h3>
                                    <h4 className="plan-card-header">{FOOD_TYPE_LABELS[plan.foodType] ?? plan.foodType}</h4>
                                    <div className="plan-card-meta">
                                        <span>{plan.items?.length || 0} items</span>
                                        <span className="kcal">{totalKcal} kcal</span>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => handleEdit(plan)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDelete(plan)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="diet-item-table-header">
                                    <span>Food</span>
                                    <span>Quantity</span>
                                    <span>Time</span>
                                    <span>kcal</span>
                                    <span>Notes</span>
                                </div>

                                {(plan.items ?? []).map(item => (
                                    <div key={item.id} className="diet-item-row">
                                        <span>{item.food}</span>
                                        <span className="item-qty">{item.quantity} {item.unit}</span>
                                        <span className="item-time">{item.time}</span>
                                        <span className="item-kcal">{item.calories} kcal</span>
                                        <span className="item-notes">{item.notes}</span>
                                    </div>
                                ))}

                                <div className="assigned-members">
                                    <span className="assigned-label">Assigned to:</span>
                                    {plan.assigned_members?.length > 0
                                        ? plan.assigned_members.map((name, i) => (
                                            <span key={i} className="member-chip">{name}</span>
                                        ))
                                        : <span className="no-members">No members assigned</span>
                                    }
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <CreatePlanModal
                    plan={editPlan}
                    onClose={handleModalClose}
                    onSave={handleModalSave}
                />
            )}
        </div>
    );
};

export default DietPage;
