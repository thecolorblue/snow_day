"use client";

import { AppHeader } from "@/components";

interface Student {
  id: number;
  name: string;
  friends: string;
  interests: string;
}

interface StudentListProps {
  students?: Student[];
  onRemoveStudent: (studentId: number) => void;
}

export default function StudentList({ students, onRemoveStudent }: StudentListProps) {
  return (
    <>
      <AppHeader></AppHeader>
      {/* Students List */}
      {students && students.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <div key={student.id} className="bg-gray-50 p-4 rounded-md border">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{student.name}</h3>
                <button
                  onClick={() => onRemoveStudent(student.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Friends:</span>
                  <p className="text-gray-900">{student.friends}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Interests:</span>
                  <p className="text-gray-900">{student.interests}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No students added yet.</p>
          <p className="text-sm">Click "Add Student" to get started.</p>
        </div>
      )}
    </>
  );
}