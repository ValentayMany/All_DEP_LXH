<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/env.php';
require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/jwt.php';
require_once __DIR__ . '/handlers/auth.php';
require_once __DIR__ . '/handlers/departments.php';
require_once __DIR__ . '/handlers/documents.php';
require_once __DIR__ . '/handlers/approvers.php';

load_env(dirname(__DIR__) . '/.env');

send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/api#', '', $uri);
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

try {
    route_request($method, $path);
} catch (PDOException $e) {
    error_log('DB error: ' . $e->getMessage());
    json_response(['success' => false, 'message' => 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ'], 500);
} catch (Throwable $e) {
    error_log('API error: ' . $e->getMessage());
    json_response(['success' => false, 'message' => 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ'], 500);
}

function route_request(string $method, string $path): void
{
    if ($path === '/auth/login' && $method === 'POST') {
        handle_auth_login();
    }
    if ($path === '/auth/register' && $method === 'POST') {
        handle_auth_register();
    }
    if ($path === '/departments' && $method === 'GET') {
        handle_departments_list();
    }

    if (str_starts_with($path, '/documents')) {
        route_documents($method, $path);
        return;
    }

    if (str_starts_with($path, '/approvers')) {
        route_approvers($method, $path);
        return;
    }

    json_response(['success' => false, 'message' => 'Not found'], 404);
}

function route_documents(string $method, string $path): void
{
    if ($path === '/documents/next-number' && $method === 'GET') {
        handle_documents_next_number();
    }
    if ($path === '/documents' && $method === 'GET') {
        handle_documents_list();
    }
    if ($path === '/documents' && $method === 'POST') {
        handle_documents_create();
    }

    if (preg_match('#^/documents/(.+)$#', $path, $m)) {
        $docNumber = rawurldecode($m[1]);
        if ($method === 'PUT') {
            handle_documents_update($docNumber);
        }
        if ($method === 'DELETE') {
            $user = require_auth();
            handle_documents_delete($user, $docNumber);
        }
    }

    json_response(['success' => false, 'message' => 'Not found'], 404);
}

function route_approvers(string $method, string $path): void
{
    if ($path === '/approvers/active' && $method === 'GET') {
        require_auth();
        handle_approvers_active();
    }
    if ($path === '/approvers' && $method === 'GET') {
        $user = require_auth();
        handle_approvers_list($user);
    }
    if ($path === '/approvers' && $method === 'POST') {
        $user = require_auth();
        handle_approvers_create($user);
    }

    if (preg_match('#^/approvers/([a-f0-9\-]+)$#i', $path, $m) && $method === 'PUT') {
        $user = require_auth();
        handle_approvers_update($user, $m[1]);
    }

    json_response(['success' => false, 'message' => 'Not found'], 404);
}
