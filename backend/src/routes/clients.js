import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../services/auth.js';
import { writeAuditLog } from '../services/audit.js';

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

clientsRouter.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM clients ORDER BY name');
  return res.json(rows);
});

clientsRouter.post('/', async (req, res) => {
  const { name, contact_person, phone, email } = req.body;
  const { rows } = await query(
    'INSERT INTO clients (name, contact_person, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, contact_person, phone, email]
  );
  await writeAuditLog(req.user.id, 'client.create', `Created client ${name}`);
  return res.status(201).json(rows[0]);
});

clientsRouter.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (!rows[0]) {
    return res.status(404).json({ error: 'Client not found' });
  }
  return res.json(rows[0]);
});

clientsRouter.put('/:id', async (req, res) => {
  const { name, contact_person, phone, email } = req.body;
  const { rows } = await query(
    'UPDATE clients SET name = $1, contact_person = $2, phone = $3, email = $4 WHERE id = $5 RETURNING *',
    [name, contact_person, phone, email, req.params.id]
  );
  if (!rows[0]) {
    return res.status(404).json({ error: 'Client not found' });
  }
  await writeAuditLog(req.user.id, 'client.update', `Updated client ${rows[0].name}`);
  return res.json(rows[0]);
});

clientsRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM clients WHERE id = $1', [req.params.id]);
  await writeAuditLog(req.user.id, 'client.delete', `Deleted client ${req.params.id}`);
  return res.status(204).send();
});
