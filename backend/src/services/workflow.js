export const buildPlanApproval = ({ action, reason }) => {
  if (action === 'approve') {
    return { status: 'Approved', manager_notes: null };
  }
  if (action === 'reject') {
    return { status: 'Rejected', manager_notes: reason || 'Rejected' };
  }
  throw new Error('Unsupported approval action');
};
