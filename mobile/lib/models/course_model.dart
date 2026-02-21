class CourseModel {
  final String id;
  final String name;
  final String? duration;
  final double fee;
  final String? description;

  CourseModel({
    required this.id,
    required this.name,
    this.duration,
    required this.fee,
    this.description,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      duration: json['duration'],
      fee: (json['fee'] ?? 0).toDouble(),
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'duration': duration,
        'fee': fee,
        'description': description,
      };
}
