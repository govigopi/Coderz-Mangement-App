import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/course_model.dart';
import '../models/expense_model.dart';
import '../models/income_model.dart';
import '../models/invoice_model.dart';
import '../models/mark_model.dart';
import '../models/student_model.dart';

class ApiService {
  String? _token;

  void setToken(String? token) => _token = token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<Map<String, dynamic>> login(String email, String password, {String role = 'admin'}) async {
    final endpoint = role == 'staff' ? '/staff/login' : '/admin/login';
    final res = await http.post(
      Uri.parse('${ApiConfig.auth}$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    return _handle(res);
  }

  Future<List<CourseModel>> getCourses() async {
    final res = await http.get(Uri.parse(ApiConfig.courses), headers: _headers);
    final data = _handleList(res);
    return (data as List).map((e) => CourseModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CourseModel> createCourse(CourseModel c) async {
    final res = await http.post(
      Uri.parse(ApiConfig.courses),
      headers: _headers,
      body: jsonEncode(c.toJson()),
    );
    return CourseModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<CourseModel> updateCourse(String id, CourseModel c) async {
    final res = await http.put(
      Uri.parse('${ApiConfig.courses}/$id'),
      headers: _headers,
      body: jsonEncode(c.toJson()),
    );
    return CourseModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<void> deleteCourse(String id) async {
    final res = await http.delete(Uri.parse('${ApiConfig.courses}/$id'), headers: _headers);
    _handle(res);
  }

  Future<List<StudentModel>> getStudents({String? status, String? search}) async {
    var url = ApiConfig.students;
    final q = <String>[];
    if (status != null) q.add('status=$status');
    if (search != null && search.isNotEmpty) q.add('search=${Uri.encodeComponent(search)}');
    if (q.isNotEmpty) url += '?${q.join('&')}';
    final res = await http.get(Uri.parse(url), headers: _headers);
    final data = _handleList(res);
    return (data as List).map((e) => StudentModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<StudentModel> createStudent(StudentModel s) async {
    final res = await http.post(
      Uri.parse(ApiConfig.students),
      headers: _headers,
      body: jsonEncode(s.toJson()),
    );
    return StudentModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<StudentModel> getStudent(String id) async {
    final res = await http.get(Uri.parse('${ApiConfig.students}/$id'), headers: _headers);
    return StudentModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<StudentModel> updateStudent(String id, StudentModel s) async {
    final res = await http.put(
      Uri.parse('${ApiConfig.students}/$id'),
      headers: _headers,
      body: jsonEncode(s.toJson()),
    );
    return StudentModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<void> deleteStudent(String id) async {
    final res = await http.delete(Uri.parse('${ApiConfig.students}/$id'), headers: _headers);
    _handle(res);
  }

  Future<List<InvoiceModel>> getInvoices({String? studentId, String? status}) async {
    var url = ApiConfig.invoices;
    final q = <String>[];
    if (studentId != null) q.add('studentId=$studentId');
    if (status != null) q.add('status=$status');
    if (q.isNotEmpty) url += '?${q.join('&')}';
    final res = await http.get(Uri.parse(url), headers: _headers);
    final data = _handleList(res);
    return (data as List).map((e) => InvoiceModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<InvoiceModel> createInvoice(String studentId, double amount, {String? description, DateTime? dueDate}) async {
    final res = await http.post(
      Uri.parse(ApiConfig.invoices),
      headers: _headers,
      body: jsonEncode({
        'studentId': studentId,
        'amount': amount,
        'description': description,
        if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
      }),
    );
    return InvoiceModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<InvoiceModel> payInvoice(String id, double amount) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.invoices}/$id/pay'),
      headers: _headers,
      body: jsonEncode({'amount': amount}),
    );
    return InvoiceModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<List<ExpenseModel>> getExpenses({DateTime? startDate, DateTime? endDate, String? category}) async {
    var url = ApiConfig.expenses;
    final q = <String>[];
    if (startDate != null) q.add('startDate=${startDate.toIso8601String()}');
    if (endDate != null) q.add('endDate=${endDate.toIso8601String()}');
    if (category != null) q.add('category=${Uri.encodeComponent(category)}');
    if (q.isNotEmpty) url += '?${q.join('&')}';
    final res = await http.get(Uri.parse(url), headers: _headers);
    final data = _handleList(res);
    return (data as List).map((e) => ExpenseModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ExpenseModel> createExpense(ExpenseModel e) async {
    final res = await http.post(
      Uri.parse(ApiConfig.expenses),
      headers: _headers,
      body: jsonEncode(e.toJson()),
    );
    return ExpenseModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<ExpenseModel> updateExpense(String id, ExpenseModel e) async {
    final res = await http.put(
      Uri.parse('${ApiConfig.expenses}/$id'),
      headers: _headers,
      body: jsonEncode(e.toJson()),
    );
    return ExpenseModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<void> deleteExpense(String id) async {
    final res = await http.delete(Uri.parse('${ApiConfig.expenses}/$id'), headers: _headers);
    _handle(res);
  }

  Future<List<IncomeModel>> getIncome({DateTime? startDate, DateTime? endDate}) async {
    var url = ApiConfig.income;
    final q = <String>[];
    if (startDate != null) q.add('startDate=${startDate.toIso8601String()}');
    if (endDate != null) q.add('endDate=${endDate.toIso8601String()}');
    if (q.isNotEmpty) url += '?${q.join('&')}';
    final res = await http.get(Uri.parse(url), headers: _headers);
    final data = _handleList(res);
    return (data as List).map((e) => IncomeModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<IncomeModel> createIncome({required double amount, required DateTime date, String? source, String? description}) async {
    final res = await http.post(
      Uri.parse(ApiConfig.income),
      headers: _headers,
      body: jsonEncode({
        'amount': amount,
        'date': date.toIso8601String(),
        'source': source,
        'description': description,
      }),
    );
    return IncomeModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<List<MarkModel>> getMarks({String? studentId, String? subject, String? term}) async {
    var url = ApiConfig.marks;
    final q = <String>[];
    if (studentId != null) q.add('studentId=$studentId');
    if (subject != null) q.add('subject=${Uri.encodeComponent(subject)}');
    if (term != null) q.add('term=${Uri.encodeComponent(term)}');
    if (q.isNotEmpty) url += '?${q.join('&')}';
    final res = await http.get(Uri.parse(url), headers: _headers);
    final data = _handleList(res);
    return (data as List).map((e) => MarkModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<MarkModel> createMark(MarkModel m) async {
    final res = await http.post(
      Uri.parse(ApiConfig.marks),
      headers: _headers,
      body: jsonEncode(m.toJson()),
    );
    return MarkModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<MarkModel> updateMark(String id, MarkModel m) async {
    final res = await http.put(
      Uri.parse('${ApiConfig.marks}/$id'),
      headers: _headers,
      body: jsonEncode(m.toJson()),
    );
    return MarkModel.fromJson(_handle(res) as Map<String, dynamic>);
  }

  Future<void> deleteMark(String id) async {
    final res = await http.delete(Uri.parse('${ApiConfig.marks}/$id'), headers: _headers);
    _handle(res);
  }

  Future<Map<String, dynamic>> getDashboard() async {
    final res = await http.get(Uri.parse('${ApiConfig.reports}/dashboard'), headers: _headers);
    return _handle(res) as Map<String, dynamic>;
  }

  Future<List<dynamic>> getMonthlyIncome() async {
    final res = await http.get(Uri.parse('${ApiConfig.reports}/monthly-income'), headers: _headers);
    return _handleList(res);
  }

  Future<Map<String, dynamic>> getRevenuePerStudent() async {
    final res = await http.get(Uri.parse('${ApiConfig.reports}/revenue-per-student'), headers: _headers);
    return _handle(res) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getIncomeExpense({DateTime? start, DateTime? end}) async {
    var url = '${ApiConfig.reports}/income-expense';
    final q = <String>[];
    if (start != null) q.add('startDate=${start.toIso8601String()}');
    if (end != null) q.add('endDate=${end.toIso8601String()}');
    if (q.isNotEmpty) url += '?${q.join('&')}';
    final res = await http.get(Uri.parse(url), headers: _headers);
    return _handle(res) as Map<String, dynamic>;
  }

  String invoicePdfUrl(String invoiceId) =>
      '${ApiConfig.reports.replaceFirst('/api', '')}/invoice-pdf/$invoiceId';

  String marksPdfUrl(String studentId) =>
      '${ApiConfig.reports.replaceFirst('/api', '')}/marks-pdf/$studentId';

  String incomeExpenseExcelUrl({DateTime? start, DateTime? end}) {
    var url = '${ApiConfig.reports}/income-expense-excel';
    final q = <String>[];
    if (start != null) q.add('startDate=${start.toIso8601String()}');
    if (end != null) q.add('endDate=${end.toIso8601String()}');
    if (q.isNotEmpty) url += '?${q.join('&')}';
    return url;
  }

  dynamic _handle(http.Response res) {
    final body = jsonDecode(res.body is String ? res.body : '{}');
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    throw Exception(body['error'] ?? body['message'] ?? 'Request failed');
  }

  List<dynamic> _handleList(http.Response res) {
    final body = _handle(res);
    return body is List ? body : [];
  }
}
