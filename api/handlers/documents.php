<?php

const DEPT_PREFIX = [
    'ພະແນກບັນຊີການເງິນ' => 'AFD/LXH/',
    'ພະແນກບໍລິຫານຫ້ອງການ' => 'AD/LXH/',
    'ພະແນກພັດທະນາທຸລະກິດ' => 'BIZ.LXH/',
    'Partnership' => 'PNS./LXH/',
    'ພະແນກBanding' => 'CBD.LXH/',
    'ຝ່າຍການແພດ' => 'MD.LXH/',
    'ພະແນກສາງ' => 'ID/LXH/',
    'ພະແນກບຸກຄະລາກອນ' => 'HR/LXH/',
    'ຝາຍບໍລິຫານ' => 'AD/LXH/',
    'ພະແນກຈັດຊື້' => 'ID/LXH/',
    'ພະແນກໄອທີ' => 'IT/LXH/',
];

function handle_documents_next_number(): void
{
    require_auth();
    $dept = trim((string) ($_GET['dept'] ?? ''));
    $isStorage = $dept === 'ພະແນກສາງ' || $dept === 'ພະແນກຈັດຊື້';
    $prefix = $isStorage ? '' : (DEPT_PREFIX[$dept] ?? 'DOC/');

    $stmt = db()->query('SELECT doc_number FROM documents ORDER BY created_at DESC');
    $maxNum = 0;
    foreach ($stmt->fetchAll() as $row) {
        $num = (string) ($row['doc_number'] ?? '');
        if ($isStorage) {
            if (str_ends_with($num, '/ID/LXH')) {
                $n = (int) str_replace('/ID/LXH', '', $num);
                if ($n > $maxNum) {
                    $maxNum = $n;
                }
            }
        } elseif (str_starts_with($num, $prefix)) {
            $n = (int) str_replace($prefix, '', $num);
            if ($n > $maxNum) {
                $maxNum = $n;
            }
        }
    }

    $nextNum = $maxNum + 1;
    $docNumber = $isStorage
        ? str_pad((string) $nextNum, 5, '0', STR_PAD_LEFT) . '/ID/LXH'
        : $prefix . str_pad((string) $nextNum, 7, '0', STR_PAD_LEFT);

    json_response(['success' => true, 'docNumber' => $docNumber]);
}

function handle_documents_list(): void
{
    require_auth();
    $role = $_GET['role'] ?? 'user';
    $dept = $_GET['dept'] ?? '';

    $sql = 'SELECT * FROM documents';
    $params = [];

    if ($role !== 'admin' && $dept !== '') {
        $depts = array_map('trim', explode(',', $dept));
        $placeholders = implode(',', array_fill(0, count($depts), '?'));
        $sql .= " WHERE department IN ($placeholders)";
        $params = $depts;
    }

    $sql .= ' ORDER BY created_at DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $formatted = array_map('format_document_row', $rows);
    json_response(['success' => true, 'data' => $formatted]);
}

function format_document_row(array $row): array
{
    $date = $row['doc_date'] ?? '';
    $time = $row['doc_time'] ?? '';
    return [
        'docNumber' => $row['doc_number'] ?? '',
        'docDate' => $date ? substr((string) $date, 0, 10) : '',
        'docTime' => $time ? substr((string) $time, 0, 8) : '',
        'subject' => $row['subject'] ?? '',
        'recipient' => $row['recipient'] ?? '',
        'docType' => $row['doc_type'] ?? '',
        'details' => $row['details'] ?? '',
        'department' => $row['department'] ?? '',
        'requesterDept' => $row['requester_dept'] ?? '',
        'approvedBy' => $row['approved_by'] ?? '',
        'createdBy' => $row['created_by'] ?? '',
        'createdAt' => $row['created_at'] ?? '',
    ];
}

function handle_documents_create(): void
{
    require_auth();
    $d = read_json_body();
    $stmt = db()->prepare(
        'INSERT INTO documents (id, doc_number, doc_date, doc_time, subject, recipient, doc_type, details, department, requester_dept, approved_by, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    try {
        $stmt->execute([
            uuid_v4(),
            $d['docNumber'] ?? '',
            $d['docDate'] ?: null,
            $d['docTime'] ?: null,
            $d['subject'] ?? '',
            $d['recipient'] ?? '',
            $d['docType'] ?? '',
            $d['details'] ?? '',
            $d['department'] ?? '',
            $d['requesterDept'] ?? '',
            $d['approvedBy'] ?? '',
            $d['createdBy'] ?? '',
        ]);
    } catch (PDOException $e) {
        json_response(['success' => false, 'message' => $e->getMessage()]);
    }
    json_response(['success' => true]);
}

function handle_documents_update(string $docNumber): void
{
    require_auth();
    $d = read_json_body();
    $stmt = db()->prepare(
        'UPDATE documents SET doc_date = ?, doc_time = ?, subject = ?, recipient = ?, doc_type = ?, details = ?, department = ?, requester_dept = ?, approved_by = ?
         WHERE doc_number = ?'
    );
    try {
        $stmt->execute([
            $d['docDate'] ?: null,
            $d['docTime'] ?: null,
            $d['subject'] ?? '',
            $d['recipient'] ?? '',
            $d['docType'] ?? '',
            $d['details'] ?? '',
            $d['department'] ?? '',
            $d['requesterDept'] ?? '',
            $d['approvedBy'] ?? '',
            $docNumber,
        ]);
    } catch (PDOException $e) {
        json_response(['success' => false, 'message' => $e->getMessage()]);
    }
    json_response(['success' => true]);
}

function handle_documents_delete(array $user, string $docNumber): void
{
    if (($user['role'] ?? '') !== 'admin') {
        json_response(['success' => false, 'message' => 'ບໍ່ມີສິດລຶບ']);
    }
    $stmt = db()->prepare('DELETE FROM documents WHERE doc_number = ?');
    try {
        $stmt->execute([$docNumber]);
    } catch (PDOException $e) {
        json_response(['success' => false, 'message' => $e->getMessage()]);
    }
    json_response(['success' => true]);
}
