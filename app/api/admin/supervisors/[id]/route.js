import { SupervisorController } from "@/modules/supervisor/supervisor.controller.js";

export async function GET(req, context) {
  return await SupervisorController.getSupervisorDetail(req, context);
}

export async function PUT(req, context) {
  return await SupervisorController.updateSupervisor(req, context);
}

export async function DELETE(req, context) {
  return await SupervisorController.deleteSupervisor(req, context);
}
