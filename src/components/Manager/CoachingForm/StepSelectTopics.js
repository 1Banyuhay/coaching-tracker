import React, { useEffect, useState } from 'react';
import { coachingService } from '../../../services/coachingService';
import { BookOpen, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import './CoachingFormSteps.css';

const StepSelectTopics = ({ formData, updateFormData }) => {
  const [library, setLibrary] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const { data } = await coachingService.getFullLibrary();
      setLibrary(data || []);
      if (data && data.length > 0) {
        setExpandedCategory(data[0].id);
      }
    } catch (error) {
      console.error('Error loading library:', error);
      toast.error('Failed to load coaching library');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handleTopicToggle = (topicId) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  const handleItemSelect = (itemId, topicId, categoryId) => {
    let selectedTopics = [...formData.selectedTopics];
    let topicEntry = selectedTopics.find(t => t.topicId === topicId);

    if (!topicEntry) {
      topicEntry = { topicId, categoryId, itemIds: [] };
      selectedTopics.push(topicEntry);
    }

    const index = topicEntry.itemIds.indexOf(itemId);
    if (index > -1) {
      topicEntry.itemIds.splice(index, 1);
      if (topicEntry.itemIds.length === 0) {
        selectedTopics = selectedTopics.filter(t => t.topicId !== topicId);
      }
    } else {
      topicEntry.itemIds.push(itemId);
    }

    updateFormData({ selectedTopics });
  };

  const isItemSelected = (itemId) => {
    return formData.selectedTopics.some(t => t.itemIds.includes(itemId));
  };

  const getSelectedCount = () => {
    return formData.selectedTopics.reduce((sum, t) => sum + t.itemIds.length, 0);
  };

  if (loading) {
    return <div className="loading-text">Loading coaching library...</div>;
  }

  return (
    <div className="step-content">
      <div className="step-section">
        <h2>What Topics Were Discussed?</h2>
        <p className="section-description">
          Select the coaching categories and specific items you discussed today.
          You don't need to cover everything in one session.
        </p>

        <div className="selected-badge">
          <BookOpen size={16} />
          <span>
            {getSelectedCount()} item{getSelectedCount() !== 1 ? 's' : ''} selected
          </span>
        </div>
      </div>

      <div className="library-browser">
        {library.map(category => (
          <div key={category.id} className="category-section">
            <button
              className="category-header"
              onClick={() => handleCategoryToggle(category.id)}
            >
              <ChevronDown
                size={20}
                className={`chevron ${
                  expandedCategory === category.id ? 'expanded' : ''
                }`}
              />
              <span className="category-name">{category.name}</span>
              <span className="topic-count">
                {category.coaching_topics?.length || 0} topics
              </span>
            </button>

            {expandedCategory === category.id && (
              <div className="topics-container">
                {category.coaching_topics?.map(topic => (
                  <div key={topic.id} className="topic-section">
                    <button
                      className="topic-header"
                      onClick={() => handleTopicToggle(topic.id)}
                    >
                      <ChevronDown
                        size={18}
                        className={`chevron ${
                          expandedTopic === topic.id ? 'expanded' : ''
                        }`}
                      />
                      <span className="topic-name">{topic.name}</span>
                      <span className="item-count">
                        {topic.coaching_items?.length || 0} items
                      </span>
                    </button>

                    {expandedTopic === topic.id && (
                      <div className="items-container">
                        {topic.coaching_items?.map(item => (
                          <label key={item.id} className="item-checkbox">
                            <input
                              type="checkbox"
                              checked={isItemSelected(item.id)}
                              onChange={() =>
                                handleItemSelect(item.id, topic.id, category.id)
                              }
                            />
                            <span className="checkmark"></span>
                            <span className="item-label">{item.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {getSelectedCount() > 0 && (
        <div className="selected-items-summary">
          <h3>Selected Items ({getSelectedCount()})</h3>
          <div className="selected-items-list">
            {formData.selectedTopics.map(topicEntry => {
              const topic = library
                .flatMap(cat => cat.coaching_topics || [])
                .find(t => t.id === topicEntry.topicId);

              return (
                <div key={topicEntry.topicId} className="selected-topic-group">
                  <h4>{topic?.name}</h4>
                  <ul>
                    {topicEntry.itemIds.map(itemId => {
                      const item = topic?.coaching_items?.find(
                        i => i.id === itemId
                      );
                      return (
                        <li key={itemId}>
                          {item?.name}
                          <button
                            className="remove-btn"
                            onClick={() =>
                              handleItemSelect(itemId, topicEntry.topicId, topicEntry.categoryId)
                            }
                            title="Remove"
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepSelectTopics;
