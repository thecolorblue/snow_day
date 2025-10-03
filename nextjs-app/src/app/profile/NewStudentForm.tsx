"use client";

import { AppHeader } from "@/components";
import { useState, useEffect } from "react";

interface FormData {
  name: string;
  friends: string;
  interests: string;
  lexile: string;
}

interface Student {
  id: number;
  name: string;
  friends: string;
  interests: string;
  lexile: string | null;
}

interface NewStudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  editingStudent?: Student | null;
  onUpdate?: (studentId: number, formData: FormData) => Promise<void>;
}

export default function NewStudentForm({ isOpen, onClose, onSubmit, editingStudent, onUpdate }: NewStudentFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    friends: "",
    interests: "",
    lexile: "",
  });

  // Update form data when editing student changes
  useEffect(() => {
    if (editingStudent) {
      setFormData({
        name: editingStudent.name,
        friends: editingStudent.friends,
        interests: editingStudent.interests,
        lexile: editingStudent.lexile || "",
      });
    } else {
      setFormData({
        name: "",
        friends: "",
        interests: "",
        lexile: "",
      });
    }
  }, [editingStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent && onUpdate) {
      await onUpdate(editingStudent.id, formData);
    } else {
      await onSubmit(formData);
    }
    // Reset form after successful submission
    setFormData({ name: "", friends: "", interests: "", lexile: "" });
  };

  const handleCancel = () => {
    setFormData({ name: "", friends: "", interests: "", lexile: "" });
    onClose();
  };

  // Lexile options based on comprehensive grade level charts
  const lexileOptions = [
    { value: "BR400L", label: "K Fall 10th Percentile BR400L" },
    { value: "BR400L", label: "K Winter 10th Percentile BR400L" },
    { value: "BR400L", label: "K Spring 10th Percentile BR400L" },
    { value: "BR400L", label: "1st Fall 10th Percentile BR400L" },
    { value: "BR325L", label: "1st Winter 10th Percentile BR325L" },
    { value: "BR235L", label: "1st Spring 10th Percentile BR235L" },
    { value: "BR90L", label: "2nd Fall 10th Percentile BR90L" },
    { value: "BR15L", label: "2nd Winter 10th Percentile BR15L" },
    { value: "60L", label: "2nd Spring 10th Percentile 60L" },
    { value: "180L", label: "3rd Fall 10th Percentile 180L" },
    { value: "245L", label: "3rd Winter 10th Percentile 245L" },
    { value: "310L", label: "3rd Spring 10th Percentile 310L" },
    { value: "410L", label: "4th Fall 10th Percentile 410L" },
    { value: "480L", label: "4th Winter 10th Percentile 480L" },
    { value: "550L", label: "4th Spring 10th Percentile 550L" },
    { value: "595L", label: "5th Fall 10th Percentile 595L" },
    { value: "620L", label: "5th Winter 10th Percentile 620L" },
    { value: "645L", label: "5th Spring 10th Percentile 645L" },
    { value: "680L", label: "6th Fall 10th Percentile 680L" },
    { value: "700L", label: "6th Winter 10th Percentile 700L" },
    { value: "720L", label: "6th Spring 10th Percentile 720L" },
    { value: "755L", label: "7th Fall 10th Percentile 755L" },
    { value: "770L", label: "7th Winter 10th Percentile 770L" },
    { value: "790L", label: "7th Spring 10th Percentile 790L" },
    { value: "815L", label: "8th Fall 10th Percentile 815L" },
    { value: "830L", label: "8th Winter 10th Percentile 830L" },
    { value: "845L", label: "8th Spring 10th Percentile 845L" },
    { value: "870L", label: "9th Fall 10th Percentile 870L" },
    { value: "885L", label: "9th Winter 10th Percentile 885L" },
    { value: "895L", label: "9th Spring 10th Percentile 895L" },
    { value: "920L", label: "10th Fall 10th Percentile 920L" },
    { value: "930L", label: "10th Winter 10th Percentile 930L" },
    { value: "940L", label: "10th Spring 10th Percentile 940L" },
    { value: "960L", label: "11th Fall 10th Percentile 960L" },
    { value: "970L", label: "11th Winter 10th Percentile 970L" },
    { value: "985L", label: "11th Spring 10th Percentile 985L" },
    { value: "960L", label: "12th Fall 10th Percentile 960L" },
    { value: "970L", label: "12th Winter 10th Percentile 970L" },
    { value: "985L", label: "12th Spring 10th Percentile 985L" },
    { value: "BR400L", label: "K Fall 25th Percentile BR400L" },
    { value: "BR400L", label: "K Winter 25th Percentile BR400L" },
    { value: "BR310L", label: "K Spring 25th Percentile BR310L" },
    { value: "BR200L", label: "1st Fall 25th Percentile BR200L" },
    { value: "BR120L", label: "1st Winter 25th Percentile BR120L" },
    { value: "BR35L", label: "1st Spring 25th Percentile BR35L" },
    { value: "100L", label: "2nd Fall 25th Percentile 100L" },
    { value: "170L", label: "2nd Winter 25th Percentile 170L" },
    { value: "245L", label: "2nd Spring 25th Percentile 245L" },
    { value: "355L", label: "3rd Fall 25th Percentile 355L" },
    { value: "415L", label: "3rd Winter 25th Percentile 415L" },
    { value: "480L", label: "3rd Spring 25th Percentile 480L" },
    { value: "570L", label: "4th Fall 25th Percentile 570L" },
    { value: "635L", label: "4th Winter 25th Percentile 635L" },
    { value: "700L", label: "4th Spring 25th Percentile 700L" },
    { value: "745L", label: "5th Fall 25th Percentile 745L" },
    { value: "770L", label: "5th Winter 25th Percentile 770L" },
    { value: "795L", label: "5th Spring 25th Percentile 795L" },
    { value: "835L", label: "6th Fall 25th Percentile 835L" },
    { value: "855L", label: "6th Winter 25th Percentile 855L" },
    { value: "875L", label: "6th Spring 25th Percentile 875L" },
    { value: "910L", label: "7th Fall 25th Percentile 910L" },
    { value: "925L", label: "7th Winter 25th Percentile 925L" },
    { value: "940L", label: "7th Spring 25th Percentile 940L" },
    { value: "970L", label: "8th Fall 25th Percentile 970L" },
    { value: "985L", label: "8th Winter 25th Percentile 985L" },
    { value: "1000L", label: "8th Spring 25th Percentile 1000L" },
    { value: "1025L", label: "9th Fall 25th Percentile 1025L" },
    { value: "1040L", label: "9th Winter 25th Percentile 1040L" },
    { value: "1050L", label: "9th Spring 25th Percentile 1050L" },
    { value: "1075L", label: "10th Fall 25th Percentile 1075L" },
    { value: "1085L", label: "10th Winter 25th Percentile 1085L" },
    { value: "1095L", label: "10th Spring 25th Percentile 1095L" },
    { value: "1115L", label: "11th Fall 25th Percentile 1115L" },
    { value: "1130L", label: "11th Winter 25th Percentile 1130L" },
    { value: "1140L", label: "11th Spring 25th Percentile 1140L" },
    { value: "1115L", label: "12th Fall 25th Percentile 1115L" },
    { value: "1130L", label: "12th Winter 25th Percentile 1130L" },
    { value: "1140L", label: "12th Spring 25th Percentile 1140L" },
    { value: "BR345L", label: "K Fall 50th Percentile BR345L" },
    { value: "BR250L", label: "K Winter 50th Percentile BR250L" },
    { value: "BR160L", label: "K Spring 50th Percentile BR160L" },
    { value: "10L", label: "1st Fall 50th Percentile 10L" },
    { value: "85L", label: "1st Winter 50th Percentile 85L" },
    { value: "165L", label: "1st Spring 50th Percentile 165L" },
    { value: "290L", label: "2nd Fall 50th Percentile 290L" },
    { value: "355L", label: "2nd Winter 50th Percentile 355L" },
    { value: "425L", label: "2nd Spring 50th Percentile 425L" },
    { value: "530L", label: "3rd Fall 50th Percentile 530L" },
    { value: "590L", label: "3rd Winter 50th Percentile 590L" },
    { value: "645L", label: "3rd Spring 50th Percentile 645L" },
    { value: "735L", label: "4th Fall 50th Percentile 735L" },
    { value: "790L", label: "4th Winter 50th Percentile 790L" },
    { value: "850L", label: "4th Spring 50th Percentile 850L" },
    { value: "900L", label: "5th Fall 50th Percentile 900L" },
    { value: "925L", label: "5th Winter 50th Percentile 925L" },
    { value: "950L", label: "5th Spring 50th Percentile 950L" },
    { value: "990L", label: "6th Fall 50th Percentile 990L" },
    { value: "1010L", label: "6th Winter 50th Percentile 1010L" },
    { value: "1030L", label: "6th Spring 50th Percentile 1030L" },
    { value: "1060L", label: "7th Fall 50th Percentile 1060L" },
    { value: "1080L", label: "7th Winter 50th Percentile 1080L" },
    { value: "1095L", label: "7th Spring 50th Percentile 1095L" },
    { value: "1125L", label: "8th Fall 50th Percentile 1125L" },
    { value: "1140L", label: "8th Winter 50th Percentile 1140L" },
    { value: "1155L", label: "8th Spring 50th Percentile 1155L" },
    { value: "1180L", label: "9th Fall 50th Percentile 1180L" },
    { value: "1195L", label: "9th Winter 50th Percentile 1195L" },
    { value: "1205L", label: "9th Spring 50th Percentile 1205L" },
    { value: "1230L", label: "10th Fall 50th Percentile 1230L" },
    { value: "1240L", label: "10th Winter 50th Percentile 1240L" },
    { value: "1250L", label: "10th Spring 50th Percentile 1250L" },
    { value: "1270L", label: "11th Fall 50th Percentile 1270L" },
    { value: "1285L", label: "11th Winter 50th Percentile 1285L" },
    { value: "1295L", label: "11th Spring 50th Percentile 1295L" },
    { value: "1270L", label: "12th Fall 50th Percentile 1270L" },
    { value: "1285L", label: "12th Winter 50th Percentile 1285L" },
    { value: "1295L", label: "12th Spring 50th Percentile 1295L" },
    { value: "BR195L", label: "K Fall 75th Percentile BR195L" },
    { value: "BR100L", label: "K Winter 75th Percentile BR100L" },
    { value: "BR5L", label: "K Spring 75th Percentile BR5L" },
    { value: "220L", label: "1st Fall 75th Percentile 220L" },
    { value: "290L", label: "1st Winter 75th Percentile 290L" },
    { value: "365L", label: "1st Spring 75th Percentile 365L" },
    { value: "480L", label: "2nd Fall 75th Percentile 480L" },
    { value: "545L", label: "2nd Winter 75th Percentile 545L" },
    { value: "605L", label: "2nd Spring 75th Percentile 605L" },
    { value: "705L", label: "3rd Fall 75th Percentile 705L" },
    { value: "760L", label: "3rd Winter 75th Percentile 760L" },
    { value: "810L", label: "3rd Spring 75th Percentile 810L" },
    { value: "895L", label: "4th Fall 75th Percentile 895L" },
    { value: "950L", label: "4th Winter 75th Percentile 950L" },
    { value: "1005L", label: "4th Spring 75th Percentile 1005L" },
    { value: "1050L", label: "5th Fall 75th Percentile 1050L" },
    { value: "1075L", label: "5th Winter 75th Percentile 1075L" },
    { value: "1100L", label: "5th Spring 75th Percentile 1100L" },
    { value: "1140L", label: "6th Fall 75th Percentile 1140L" },
    { value: "1160L", label: "6th Winter 75th Percentile 1160L" },
    { value: "1180L", label: "6th Spring 75th Percentile 1180L" },
    { value: "1215L", label: "7th Fall 75th Percentile 1215L" },
    { value: "1230L", label: "7th Winter 75th Percentile 1230L" },
    { value: "1250L", label: "7th Spring 75th Percentile 1250L" },
    { value: "1280L", label: "8th Fall 75th Percentile 1280L" },
    { value: "1295L", label: "8th Winter 75th Percentile 1295L" },
    { value: "1310L", label: "8th Spring 75th Percentile 1310L" },
    { value: "1335L", label: "9th Fall 75th Percentile 1335L" },
    { value: "1345L", label: "9th Winter 75th Percentile 1345L" },
    { value: "1360L", label: "9th Spring 75th Percentile 1360L" },
    { value: "1385L", label: "10th Fall 75th Percentile 1385L" },
    { value: "1395L", label: "10th Winter 75th Percentile 1395L" },
    { value: "1410L", label: "10th Spring 75th Percentile 1410L" },
    { value: "1425L", label: "11th Fall 75th Percentile 1425L" },
    { value: "1440L", label: "11th Winter 75th Percentile 1440L" },
    { value: "1450L", label: "11th Spring 75th Percentile 1450L" },
    { value: "1425L", label: "12th Fall 75th Percentile 1425L" },
    { value: "1440L", label: "12th Winter 75th Percentile 1440L" },
    { value: "1450L", label: "12th Spring 75th Percentile 1450L" },
    { value: "BR45L", label: "K Fall 90th Percentile BR45L" },
    { value: "60L", label: "K Winter 90th Percentile 60L" },
    { value: "145L", label: "K Spring 90th Percentile 145L" },
    { value: "430L", label: "1st Fall 90th Percentile 430L" },
    { value: "495L", label: "1st Winter 90th Percentile 495L" },
    { value: "565L", label: "1st Spring 90th Percentile 565L" },
    { value: "670L", label: "2nd Fall 90th Percentile 670L" },
    { value: "730L", label: "2nd Winter 90th Percentile 730L" },
    { value: "790L", label: "2nd Spring 90th Percentile 790L" },
    { value: "880L", label: "3rd Fall 90th Percentile 880L" },
    { value: "930L", label: "3rd Winter 90th Percentile 930L" },
    { value: "980L", label: "3rd Spring 90th Percentile 980L" },
    { value: "1055L", label: "4th Fall 90th Percentile 1055L" },
    { value: "1105L", label: "4th Winter 90th Percentile 1105L" },
    { value: "1155L", label: "4th Spring 90th Percentile 1155L" },
    { value: "1205L", label: "5th Fall 90th Percentile 1205L" },
    { value: "1230L", label: "5th Winter 90th Percentile 1230L" },
    { value: "1255L", label: "5th Spring 90th Percentile 1255L" },
    { value: "1295L", label: "6th Fall 90th Percentile 1295L" },
    { value: "1315L", label: "6th Winter 90th Percentile 1315L" },
    { value: "1335L", label: "6th Spring 90th Percentile 1335L" },
    { value: "1370L", label: "7th Fall 90th Percentile 1370L" },
    { value: "1385L", label: "7th Winter 90th Percentile 1385L" },
    { value: "1405L", label: "7th Spring 90th Percentile 1405L" },
    { value: "1430L", label: "8th Fall 90th Percentile 1430L" },
    { value: "1450L", label: "8th Winter 90th Percentile 1450L" },
    { value: "1465L", label: "8th Spring 90th Percentile 1465L" },
    { value: "1490L", label: "9th Fall 90th Percentile 1490L" },
    { value: "1500L", label: "9th Winter 90th Percentile 1500L" },
    { value: "1515L", label: "9th Spring 90th Percentile 1515L" },
    { value: "1540L", label: "10th Fall 90th Percentile 1540L" },
    { value: "1550L", label: "10th Winter 90th Percentile 1550L" },
    { value: "1565L", label: "10th Spring 90th Percentile 1565L" },
    { value: "1585L", label: "11th Fall 90th Percentile 1585L" },
    { value: "1595L", label: "11th Winter 90th Percentile 1595L" },
    { value: "1605L", label: "11th Spring 90th Percentile 1605L" },
    { value: "1585L", label: "12th Fall 90th Percentile 1585L" },
    { value: "1595L", label: "12th Winter 90th Percentile 1595L" },
    { value: "1605L", label: "12th Spring 90th Percentile 1605L" },
  ].filter((option, index, self) =>
    index === self.findIndex(o => o.value === option.value)
  ).sort((a, b) => a.label.localeCompare(b.label));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingStudent ? 'Edit Student' : 'Add Student'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="friends" className="block text-sm font-medium text-gray-700 mb-1">
              Friends
            </label>
            <input
              type="text"
              id="friends"
              value={formData.friends}
              onChange={(e) => setFormData({ ...formData, friends: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
              Interests
            </label>
            <input
              type="text"
              id="interests"
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="lexile" className="block text-sm font-medium text-gray-700 mb-1">
              Lexile Level
            </label>
            <select
              id="lexile"
              value={formData.lexile}
              onChange={(e) => setFormData({ ...formData, lexile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Lexile Level --</option>
              {lexileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {editingStudent ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
