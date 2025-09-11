"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import NewStudentForm from "./NewStudentForm";
import StudentList from "./StudentList";
import AppHeader from "@/components/AppHeader";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  const handleAddStudent = async (formData: { name: string; friends: string; interests: string }) => {
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsAddingStudent(false);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        console.error("Failed to add student");
        console.log(response);
      }
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!confirm("Are you sure you want to remove this student?")) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        console.error("Failed to remove student");
      }
    } catch (error) {
      console.error("Error removing student:", error);
    }
  };

  return (
    <>
    <AppHeader />
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          </div>

          <div className="p-6">
            {/* Guardian Information */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Email:</p>
                <p className="text-lg font-medium text-gray-900">{session.user?.email}</p>
              </div>
            </div>

            {/* Students Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Students</h2>
                <button
                  onClick={() => setIsAddingStudent(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Add Student
                </button>
              </div>

              <NewStudentForm
                isOpen={isAddingStudent}
                onClose={() => setIsAddingStudent(false)}
                onSubmit={handleAddStudent}
              />

              <StudentList
                students={session.guardian?.students}
                onRemoveStudent={handleRemoveStudent}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
}