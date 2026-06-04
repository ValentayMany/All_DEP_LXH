<?php

function handle_departments_list(): void
{
    $stmt = db()->query('SELECT id, name FROM departments ORDER BY name');
    $rows = $stmt->fetchAll();
    json_response(['success' => true, 'data' => $rows]);
}
