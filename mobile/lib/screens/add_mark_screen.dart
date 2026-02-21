import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/mark_model.dart';

class AddMarkScreen extends StatefulWidget {
  final String studentId;
  final String studentName;

  const AddMarkScreen({super.key, required this.studentId, required this.studentName});

  @override
  State<AddMarkScreen> createState() => _AddMarkScreenState();
}

class _AddMarkScreenState extends State<AddMarkScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _marksController = TextEditingController();
  final _maxController = TextEditingController(text: '100');
  final _termController = TextEditingController();
  DateTime _examDate = DateTime.now();
  bool _loading = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _marksController.dispose();
    _maxController.dispose();
    _termController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final marks = double.tryParse(_marksController.text);
    final max = double.tryParse(_maxController.text) ?? 100;
    if (marks == null || marks < 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid marks')));
      return;
    }
    setState(() => _loading = true);
    try {
      final model = MarkModel(id: '', studentId: widget.studentId, subject: _subjectController.text.trim(), marks: marks, maxMarks: max, examDate: _examDate, term: _termController.text.trim().isEmpty ? null : _termController.text.trim());
      await context.read<AuthProvider>().api.createMark(model);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Marks saved')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Add Marks – ${widget.studentName}')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(controller: _subjectController, decoration: const InputDecoration(labelText: 'Subject *', border: OutlineInputBorder()), validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _marksController, decoration: const InputDecoration(labelText: 'Marks obtained *', border: OutlineInputBorder()), keyboardType: TextInputType.number, validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _maxController, decoration: const InputDecoration(labelText: 'Max marks', border: OutlineInputBorder()), keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            TextFormField(controller: _termController, decoration: const InputDecoration(labelText: 'Term (e.g. Mid-term)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            ListTile(
              title: const Text('Exam Date'),
              subtitle: Text('${_examDate.year}-${_examDate.month.toString().padLeft(2, '0')}-${_examDate.day.toString().padLeft(2, '0')}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final d = await showDatePicker(context: context, initialDate: _examDate, firstDate: DateTime(2020), lastDate: DateTime.now());
                if (d != null) setState(() => _examDate = d);
              },
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: _loading ? null : _save, style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)), child: _loading ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save')),
          ],
        ),
      ),
    );
  }
}
