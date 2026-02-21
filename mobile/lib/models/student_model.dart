import 'course_model.dart';

class StudentModel {
  final String id;
  final String name;
  final String? email;
  final String mobile;
  final String? guardianName;
  final String? guardianMobile;
  final String? address;
  final DateTime admissionDate;
  final List<CourseModel> courses;
  final double totalFees;
  final double paidAmount;
  final double pendingAmount;
  final String status;

  StudentModel({
    required this.id,
    required this.name,
    this.email,
    required this.mobile,
    this.guardianName,
    this.guardianMobile,
    this.address,
    required this.admissionDate,
    this.courses = const [],
    this.totalFees = 0,
    this.paidAmount = 0,
    this.pendingAmount = 0,
    this.status = 'active',
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    final coursesList = json['courses'] as List<dynamic>?;
    return StudentModel(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'],
      mobile: json['mobile'] ?? '',
      guardianName: json['guardianName'],
      guardianMobile: json['guardianMobile'],
      address: json['address'],
      admissionDate: json['admissionDate'] != null
          ? DateTime.parse(json['admissionDate'].toString())
          : DateTime.now(),
      courses: coursesList != null
          ? coursesList.map((c) => CourseModel.fromJson(c as Map<String, dynamic>)).toList()
          : [],
      totalFees: (json['totalFees'] ?? 0).toDouble(),
      paidAmount: (json['paidAmount'] ?? 0).toDouble(),
      pendingAmount: (json['pendingAmount'] ?? 0).toDouble(),
      status: json['status'] ?? 'active',
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'mobile': mobile,
        'guardianName': guardianName,
        'guardianMobile': guardianMobile,
        'address': address,
        'admissionDate': admissionDate.toIso8601String(),
        'courses': courses.map((c) => c.id).toList(),
        'totalFees': totalFees,
        'paidAmount': paidAmount,
        'status': status,
      };
}
