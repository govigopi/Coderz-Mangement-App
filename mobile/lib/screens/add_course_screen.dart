import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/course_model.dart';

class AddCourseScreen extends StatefulWidget {
  final CourseModel? course;

  const AddCourseScreen({super.key, this.course});

  @override
  State<AddCourseScreen> createState() => _AddCourseScreenState();
}

class _AddCourseScreenState extends State<AddCourseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _durationController = TextEditingController();
  final _feeController = TextEditingController();
  final _descController = TextEditingController();
  bool _loading = false;
  bool get _isEdit => widget.course != null;

  @override
  void initState() {
    super.initState();
    final c = widget.course;
    _nameController.text = c?.name ?? '';
    _durationController.text = c?.duration ?? '';
    _feeController.text = c?.fee.toString() ?? '';
    _descController.text = c?.description ?? '';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _durationController.dispose();
    _feeController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final fee = double.tryParse(_feeController.text);
    if (fee == null || fee < 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid fee')));
      return;
    }
    setState(() => _loading = true);
    try {
      final api = context.read<AuthProvider>().api;
      final model = CourseModel(
        id: widget.course?.id ?? '',
        name: _nameController.text.trim(),
        duration: _durationController.text.trim().isEmpty ? null : _durationController.text.trim(),
        fee: fee,
        description: _descController.text.trim().isEmpty ? null : _descController.text.trim(),
      );
      if (_isEdit) await api.updateCourse(widget.course!.id, model);
      else await api.createCourse(model);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_isEdit ? 'Course updated' : 'Course added')));
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
      appBar: AppBar(title: Text(_isEdit ? 'Edit Course' : 'Add Course')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(controller: _nameController, decoration: const InputDecoration(labelText: 'Course name *', border: OutlineInputBorder()), validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _durationController, decoration: const InputDecoration(labelText: 'Duration (e.g. 6 months)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextFormField(controller: _feeController, decoration: const InputDecoration(labelText: 'Fee (₹) *', border: OutlineInputBorder()), keyboardType: TextInputType.number, validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _descController, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()), maxLines: 2),
            const SizedBox(height: 24),
            FilledButton(onPressed: _loading ? null : _save, style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)), child: _loading ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : Text(_isEdit ? 'Update' : 'Save')),
          ],
        ),
      ),
    );
  }
}
