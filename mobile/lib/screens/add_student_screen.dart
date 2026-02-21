import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../models/student_model.dart';
import '../models/course_model.dart';

class AddStudentScreen extends StatefulWidget {
  final StudentModel? student;

  const AddStudentScreen({super.key, this.student});

  @override
  State<AddStudentScreen> createState() => _AddStudentScreenState();
}

class _AddStudentScreenState extends State<AddStudentScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _name, _email, _mobile, _guardianName, _guardianMobile, _address;
  DateTime _admissionDate = DateTime.now();
  List<CourseModel> _allCourses = [];
  List<String> _selectedCourseIds = [];
  double _totalFees = 0;
  bool _loading = false;
  bool get _isEdit => widget.student != null;

  @override
  void initState() {
    super.initState();
    final s = widget.student;
    _name = TextEditingController(text: s?.name ?? '');
    _email = TextEditingController(text: s?.email ?? '');
    _mobile = TextEditingController(text: s?.mobile ?? '');
    _guardianName = TextEditingController(text: s?.guardianName ?? '');
    _guardianMobile = TextEditingController(text: s?.guardianMobile ?? '');
    _address = TextEditingController(text: s?.address ?? '');
    _admissionDate = s?.admissionDate ?? DateTime.now();
    _selectedCourseIds = s?.courses.map((e) => e.id).toList() ?? [];
    _totalFees = s?.totalFees ?? 0;
    _loadCourses();
  }

  Future<void> _loadCourses() async {
    try {
      final list = await context.read<AuthProvider>().api.getCourses();
      if (mounted) setState(() => _allCourses = list);
    } catch (_) {}
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _mobile.dispose();
    _guardianName.dispose();
    _guardianMobile.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final api = context.read<AuthProvider>().api;
      final model = StudentModel(
        id: widget.student?.id ?? '',
        name: _name.text.trim(),
        email: _email.text.trim().isEmpty ? null : _email.text.trim(),
        mobile: _mobile.text.trim(),
        guardianName: _guardianName.text.trim().isEmpty ? null : _guardianName.text.trim(),
        guardianMobile: _guardianMobile.text.trim().isEmpty ? null : _guardianMobile.text.trim(),
        address: _address.text.trim().isEmpty ? null : _address.text.trim(),
        admissionDate: _admissionDate,
        courses: _allCourses.where((c) => _selectedCourseIds.contains(c.id)).toList(),
        totalFees: _totalFees,
        paidAmount: widget.student?.paidAmount ?? 0,
        status: widget.student?.status ?? 'active',
      );
      StudentModel? created;
      if (_isEdit) {
        await api.updateStudent(widget.student!.id, model);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Student updated')));
      } else {
        created = await api.createStudent(model);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Student added')));
        if (mounted && created != null && _totalFees > 0) {
          final gen = await showDialog<bool>(
            context: context,
            builder: (c) => AlertDialog(
              title: const Text('Generate admission invoice?'),
              content: Text('Create invoice for ₹${_totalFees.toStringAsFixed(0)} for ${created!.name}?'),
              actions: [
                TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Skip')),
                FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Generate')),
              ],
            ),
          );
          if (gen == true) {
            try {
              await api.createInvoice(created!.id, _totalFees, description: 'Admission / Course fees');
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invoice created')));
            } catch (_) {}
          }
        }
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit Student' : 'Add Student')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Name *', border: OutlineInputBorder()), validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _mobile, decoration: const InputDecoration(labelText: 'Mobile *', border: OutlineInputBorder()), keyboardType: TextInputType.phone, validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _email, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()), keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 12),
            TextFormField(controller: _guardianName, decoration: const InputDecoration(labelText: 'Guardian Name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextFormField(controller: _guardianMobile, decoration: const InputDecoration(labelText: 'Guardian Mobile', border: OutlineInputBorder()), keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            TextFormField(controller: _address, decoration: const InputDecoration(labelText: 'Address', border: OutlineInputBorder()), maxLines: 2),
            const SizedBox(height: 12),
            ListTile(
              title: const Text('Admission Date'),
              subtitle: Text(DateFormat.yMMMd().format(_admissionDate)),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final d = await showDatePicker(context: context, initialDate: _admissionDate, firstDate: DateTime(2020), lastDate: DateTime.now());
                if (d != null) setState(() => _admissionDate = d);
              },
            ),
            const SizedBox(height: 12),
            const Text('Courses', style: TextStyle(fontWeight: FontWeight.w600)),
            ..._allCourses.map((c) => CheckboxListTile(
                  title: Text('${c.name} (₹${c.fee.toInt()})'),
                  value: _selectedCourseIds.contains(c.id),
                  onChanged: (v) {
                    setState(() {
                      if (v == true) _selectedCourseIds.add(c.id);
                      else _selectedCourseIds.remove(c.id);
                      if (!_isEdit) _totalFees = _allCourses.where((x) => _selectedCourseIds.contains(x.id)).fold(0, (a, x) => a + x.fee);
                    });
                  },
                )),
            if (!_isEdit) ...[
              const SizedBox(height: 12),
              TextFormField(
                initialValue: _totalFees.toString(),
                decoration: const InputDecoration(labelText: 'Total Fees (₹)', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
                onChanged: (v) => _totalFees = double.tryParse(v) ?? 0,
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _save,
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _loading ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : Text(_isEdit ? 'Update' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }
}
