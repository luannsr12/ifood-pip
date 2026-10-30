// Short labels are editorial variants; full mode retains the event wording.
const labels = {
  "ui_order_created": "pip_status_order_created",
  "ui_order_placed": "pip_status_order_placed",
  "ui_order_confirmed": "pip_status_order_confirmed",
  "ui_the_restaurant_is_preparing_your_order": "pip_status_the_restaurant_is_preparing_your_order",
  "ui_your_order_is_being_packed": "pip_status_your_order_is_being_packed",
  "ui_courier_assigned": "pip_status_courier_assigned",
  "ui_courier_accepted_the_delivery": "pip_status_courier_accepted_the_delivery",
  "ui_courier_heading_to_the_restaurant": "pip_status_courier_heading_to_the_restaurant",
  "ui_courier_arrived_at_the_restaurant": "pip_status_courier_arrived_at_the_restaurant",
  "ui_order_ready_for_pickup": "pip_status_order_ready_for_pickup",
  "ui_order_packed": "pip_status_order_packed",
  "ui_courier_picked_up_your_order": "pip_status_courier_picked_up_your_order",
  "ui_order_out_for_delivery": "pip_status_order_out_for_delivery",
  "ui_your_order_is_on_its_way": "pip_status_your_order_is_on_its_way",
  "ui_courier_arrived_at_your_address": "pip_status_courier_arrived_at_your_address",
  "ui_order_delivered": "pip_status_order_delivered",
  "ui_order_completed": "pip_status_order_completed",
  "ui_order_canceled": "pip_status_order_canceled",
  "ui_order_ready_courier_heading_to_the_store": "pip_status_order_ready_courier_heading_to_the_store",
  "ui_checking_order_updates": "pip_status_checking_order_updates",
  "ui_waiting_for_an_order_update": "pip_status_waiting_for_an_order_update"
};
module.exports = label => labels[label] || label;
