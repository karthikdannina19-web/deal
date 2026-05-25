import { SupervisorController } from "@/modules/supervisor/supervisor.controller.js";

export async function PATCH(req, context) {
  return await SupervisorController.toggleStatus(req, context);
}
