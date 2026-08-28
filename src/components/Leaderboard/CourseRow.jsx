import { BookOpen } from 'lucide-react';

function CourseRow({ title, progress }) {
    return (
        <div className="course-row">
            <div className="course-row-icon">
                <BookOpen size={16} />
            </div>
            <div className="course-row-info">
                <strong>{title}</strong>
                <div className="course-row-bar">
                    <div className="course-row-fill" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <span className="course-row-percent">{progress}%</span>
        </div>
    );
}

export default CourseRow;
