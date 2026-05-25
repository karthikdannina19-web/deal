import { SupervisorController } from "@/modules/supervisor/supervisor.controller.js";

export async function GET(req) {
  return await SupervisorController.getSupervisorVendors(req);
}
